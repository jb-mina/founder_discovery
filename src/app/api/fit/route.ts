import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getLatestSynthesis } from "@/lib/db/self-map";

const client = new Anthropic();

const CANDIDATE_CAP = 30;

const recommendationSchema = z.object({
  id: z.string().min(1),
  reason: z.string().min(1),
});
const recommendationsSchema = z.array(recommendationSchema).max(5);

const SYSTEM_PROMPT = `당신은 창업자의 Self Map과 Problem Universe 후보를 보고 Founder-Problem Fit이 가장 높을 것으로 예상되는 후보를 큐레이션하는 큐레이터입니다.

원칙:
- 점수는 사용자만 매긴다. 당신은 추천 후보 5개와 한 줄 근거만 산출한다.
- 근거는 Self Map의 정체성·긴장·gap·패턴 중 어디에서 fit이 보이는지 짧게 명시한다 ("강점이 X와 맞물려…" 식).
- 응답은 반드시 JSON 배열만. 설명·서문·코드펜스 금지.

응답 형식:
[{"id": "<문제 ID>", "reason": "<한 문장 근거>"}]`;

export async function GET() {
  const evals = await prisma.fitEvaluation.findMany({
    include: { problemCard: true },
    orderBy: { totalScore: "desc" },
  });
  return NextResponse.json(evals);
}

export async function POST(req: NextRequest) {
  const { problemCardId, attraction, understanding, accessibility, motivation, notes } = await req.json();
  const totalScore = (attraction + understanding + accessibility + motivation) / 4;

  const existing = await prisma.fitEvaluation.findUnique({ where: { problemCardId } });
  let evaluation;
  if (existing) {
    evaluation = await prisma.fitEvaluation.update({
      where: { problemCardId },
      data: { attraction, understanding, accessibility, motivation, notes, totalScore },
    });
  } else {
    evaluation = await prisma.fitEvaluation.create({
      data: { problemCardId, attraction, understanding, accessibility, motivation, notes, totalScore },
    });
  }
  return NextResponse.json(evaluation);
}

// Token-diet 다이어트 (CLAUDE.md "Self Map 전체 + ProblemCard 전체 동시 주입 금지" 준수):
// - SelfMap: 원본 entries N개 → Synthesizer 캐시(identityStatement·tensions·gaps·clusterMeanings)로 압축.
//   캐시 miss인 신규 사용자는 카테고리별 최근 3개 fallback (전체 dump 회피).
// - ProblemCard: 미평가 후보 전수 → 최근 30개로 cap (createdAt desc).
// - 응답: 정규식 추출 → zod 스키마 검증 (CLAUDE.md "정규식 파싱 금지" 준수).
async function buildSelfMapContext(): Promise<string> {
  const synthesis = await getLatestSynthesis();
  if (synthesis) {
    const id = synthesis.userEditedStatement ?? synthesis.identityStatement;
    const tensions = JSON.parse(synthesis.tensions ?? "[]") as Array<{ description: string }>;
    const gaps = JSON.parse(synthesis.gaps ?? "[]") as Array<{ category: string; reason: string }>;
    const clusters = JSON.parse(synthesis.clusterMeanings ?? "[]") as Array<{ category: string; oneLine: string }>;
    const parts = [`정체성: ${id}`];
    if (tensions.length) parts.push("긴장:\n" + tensions.map((t) => `- ${t.description}`).join("\n"));
    if (gaps.length) parts.push("Gap:\n" + gaps.map((g) => `- ${g.category}: ${g.reason}`).join("\n"));
    if (clusters.length) parts.push("패턴:\n" + clusters.map((c) => `- ${c.category}: ${c.oneLine}`).join("\n"));
    return parts.join("\n\n");
  }
  // Cache miss fallback — first-time user 또는 캐시 무효화 직후. 카테고리별 최근 3개로 cap.
  const entries = await prisma.selfMapEntry.findMany({ orderBy: { createdAt: "asc" } });
  if (entries.length === 0) return "아직 Self Map이 없습니다.";
  const byCat = new Map<string, typeof entries>();
  for (const e of entries) {
    if (!byCat.has(e.category)) byCat.set(e.category, []);
    byCat.get(e.category)!.push(e);
  }
  const lines: string[] = [];
  for (const [cat, items] of byCat.entries()) {
    for (const e of items.slice(-3)) lines.push(`[${cat}] ${e.answer}`);
  }
  return lines.join("\n");
}

export async function PUT() {
  const candidates = await prisma.problemCard.findMany({
    where: { fitEvaluations: { none: {} } },
    orderBy: { createdAt: "desc" },
    take: CANDIDATE_CAP,
  });

  if (candidates.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const selfMapContext = await buildSelfMapContext();
  const problemsText = candidates
    .map((p) => `ID:${p.id} | ${p.title} | 대상:${p.who} | 불편:${p.painPoints} | 태그:${p.tags}`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Self Map (Synthesizer 정제):\n${selfMapContext}\n\nProblem Universe 후보 (최근 ${CANDIDATE_CAP}개 미평가):\n${problemsText}\n\n위에서 Founder-Problem Fit이 가장 높을 것 같은 후보 5개를 골라 JSON 배열로만 응답하세요.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  // 코드펜스 제거 + 첫 '[' ~ 마지막 ']' 절단 후 zod 검증.
  // 정규식으로 파싱하지 않고 JSON.parse + zod에 위임 — 실패 시 빈 응답으로 안전하게 fallback.
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  const jsonStr = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;

  try {
    const parsed: unknown = JSON.parse(jsonStr);
    const recommendations = recommendationsSchema.parse(parsed);
    return NextResponse.json({ recommendations });
  } catch (e) {
    console.error("[fit-judge] response parse failed", e, { textPreview: text.slice(0, 200) });
    return NextResponse.json({ recommendations: [], error: "parse_failed" }, { status: 500 });
  }
}
