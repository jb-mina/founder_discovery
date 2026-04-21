import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic();

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

export async function PUT(req: NextRequest) {
  // Get AI recommendations based on self map
  const selfMap = await prisma.selfMapEntry.findMany();
  const problems = await prisma.problemCard.findMany({ include: { fitEvaluations: true } });

  if (problems.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const selfMapText = selfMap.map((e) => `[${e.category}] ${e.answer}`).join("\n");
  const problemsText = problems
    .map((p) => `ID:${p.id} | ${p.title} | 대상:${p.who} | 불편:${p.painPoints} | 태그:${p.tags}`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `다음은 창업자의 Self Map입니다:\n${selfMapText || "아직 Self Map이 없습니다."}\n\n다음은 Problem Universe의 문제 카드 목록입니다:\n${problemsText}\n\nSelf Map을 기반으로 이 창업자와 Founder-Problem Fit이 가장 높을 것으로 예상되는 문제 ID를 상위 5개 선정하고, 각각 왜 fit이 있는지 한 문장으로 설명해주세요.\n\n반드시 다음 JSON 형식으로만 응답하세요:\n[{"id": "문제ID", "reason": "fit 이유 한 문장"}]`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

  return NextResponse.json({ recommendations });
}
