import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic();

export async function GET() {
  const plans = await prisma.validationPlan.findMany({
    include: { problemCard: true, realityChecks: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const { problemCardId } = await req.json();

  const card = await prisma.problemCard.findUniqueOrThrow({ where: { id: problemCardId } });
  const selfMap = await prisma.selfMapEntry.findMany();
  const selfMapText = selfMap.map((e) => `[${e.category}] ${e.answer}`).join("\n") || "Self Map 없음";

  const prompt = `다음 창업자의 Self Map과 선택된 문제에 대한 검증 플랜을 작성해주세요.

Self Map:
${selfMapText}

문제 카드:
- 제목: ${card.title}
- 대상: ${card.who}
- 언제: ${card.when}
- 왜: ${card.why}
- 불편함: ${card.painPoints}
- 현재 대체재: ${card.alternatives}

다음 JSON 형식으로만 응답하세요:
{
  "ideaDraft": "이 창업자가 풀 수 있는 사업/서비스 아이디어 초안 (2-3문장)",
  "interviewQuestions": ["질문1", "질문2", "질문3", "질문4", "질문5"],
  "experimentMethod": "어떻게 검증할지 (수기 PoC, 랜딩페이지, 고객 인터뷰 등 구체적인 방법)",
  "successSignals": "이 실험이 성공이라고 볼 수 있는 시그널",
  "failureSignals": "이 실험이 실패라고 볼 수 있는 시그널",
  "weeklySteps": [
    {"week": 1, "actions": ["액션1", "액션2"]},
    {"week": 2, "actions": ["액션1", "액션2"]},
    {"week": 3, "actions": ["액션1"]},
    {"week": 4, "actions": ["액션1", "액션2"]}
  ]
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: "당신은 Validation Designer입니다. 요청받은 JSON 형식으로만 응답하세요. 마크다운 코드블록(```)이나 다른 텍스트 없이 JSON 객체만 출력하세요.",
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "{}";
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let planData: Record<string, unknown> = {};
  try {
    planData = JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        planData = JSON.parse(jsonMatch[0]);
      } catch (e2) {
        console.error("[validation] JSON.parse fallback failed:", e2, "\nrawText:", rawText.slice(0, 500));
        return NextResponse.json({ error: "JSON parse error", raw: rawText.slice(0, 500) }, { status: 500 });
      }
    } else {
      console.error("[validation] No JSON found in response:\n", rawText.slice(0, 500));
      return NextResponse.json({ error: "No JSON found", raw: rawText.slice(0, 500) }, { status: 500 });
    }
  }

  const plan = await prisma.validationPlan.create({
    data: {
      problemCardId,
      ideaDraft: (planData.ideaDraft as string) ?? "",
      interviewQuestions: JSON.stringify((planData.interviewQuestions as string[]) ?? []),
      experimentMethod: (planData.experimentMethod as string) ?? "",
      successSignals: (planData.successSignals as string) ?? "",
      failureSignals: (planData.failureSignals as string) ?? "",
      weeklySteps: JSON.stringify((planData.weeklySteps as object[]) ?? []),
    },
    include: { problemCard: true },
  });

  return NextResponse.json(plan);
}

export async function PATCH(req: NextRequest) {
  const { id, learnings, status } = await req.json();
  const plan = await prisma.validationPlan.update({
    where: { id },
    data: { ...(learnings !== undefined ? { learnings } : {}), ...(status ? { status } : {}) },
  });
  return NextResponse.json(plan);
}
