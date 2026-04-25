import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic();

const PERSONAS = {
  coldInvestor: {
    name: "냉정한 투자자",
    system: `당신은 10년 경력의 냉정한 VC 투자자입니다. 감정 없이 사실과 데이터로만 판단합니다.
창업자가 추구하는 솔루션 가설과 그 검증 처방을 보고 투자 관점에서 가장 치명적인 약점과 리스크를 지적하세요.
희망사항이나 가정에 도전하고, 더 강한 증거가 필요한 부분을 명확히 짚어주세요.
한국어로 3-4문장으로 답하세요.`,
  },
  honestFriend: {
    name: "솔직한 친구",
    system: `당신은 창업 경험이 있는 솔직한 친구입니다. 응원하지만 거짓말은 하지 않습니다.
창업자가 추구하는 솔루션 가설과 그 검증을 친구 입장에서 솔직하게 평가하세요.
좋은 점 1가지 + 걱정되는 점 2가지를 솔직하게 말해주세요.
한국어로 3-4문장으로 답하세요.`,
  },
  socraticQ: {
    name: "소크라테스식 질문자",
    system: `당신은 소크라테스식 질문으로 창업자가 스스로 생각하게 만드는 멘토입니다.
창업자의 솔루션 가설에서 검증되지 않은 가정을 찾아내고, 그것을 확인할 수 있는 날카로운 질문 3개를 던지세요.
직접 평가하지 말고, 질문만 하세요.
한국어로 질문 3개만 답하세요.`,
  },
};

async function getPersonaOpinion(persona: keyof typeof PERSONAS, context: string): Promise<string> {
  const p = PERSONAS[persona];
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: p.system,
    messages: [{ role: "user", content: context }],
  });
  return response.content[0].type === "text" ? response.content[0].text : "";
}

export async function POST(req: NextRequest) {
  const { solutionHypothesisId } = await req.json();
  if (!solutionHypothesisId || typeof solutionHypothesisId !== "string") {
    return NextResponse.json({ error: "solutionHypothesisId is required" }, { status: 400 });
  }

  const solution = await prisma.solutionHypothesis.findUnique({
    where: { id: solutionHypothesisId },
    include: {
      problemCard: true,
      hypotheses: { orderBy: { axis: "asc" } },
    },
  });
  if (!solution) return NextResponse.json({ error: "Solution not found" }, { status: 404 });

  const hypothesesText = solution.hypotheses
    .map((h) => {
      const methods = (() => {
        try {
          return (JSON.parse(h.prescribedMethods) as string[]).join(", ");
        } catch {
          return h.prescribedMethods;
        }
      })();
      const findings = h.findings ? `\n  findings: ${h.findings.slice(0, 200)}` : "";
      return `- ${h.axis} (${h.status}): methods=${methods}; success=${h.successSignals}; failure=${h.failureSignals}${findings}`;
    })
    .join("\n");

  const context = `창업자가 추구하는 솔루션 가설과 검증 상황:

문제: ${solution.problemCard.title}
대상 고객: ${solution.problemCard.who}
핵심 불편함: ${solution.problemCard.painPoints}

솔루션 가설:
${solution.statement}

솔루션 단위 가설 검증 상태:
${hypothesesText || "(아직 처방된 가설이 없음)"}`;

  // Run 3 personas in parallel
  const [coldInvestor, honestFriend, socraticQ] = await Promise.all([
    getPersonaOpinion("coldInvestor", context),
    getPersonaOpinion("honestFriend", context),
    getPersonaOpinion("socraticQ", context),
  ]);

  // Moderator synthesizes
  const moderatorResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: `당신은 중재자입니다. 세 관점(투자자, 친구, 소크라테스)의 의견을 종합해 창업자에게 가장 중요한 다음 액션 1-2개를 제안하세요. 한국어로 2-3문장.`,
    messages: [
      {
        role: "user",
        content: `원본 컨텍스트:\n${context}\n\n냉정한 투자자:\n${coldInvestor}\n\n솔직한 친구:\n${honestFriend}\n\n소크라테스식 질문자:\n${socraticQ}`,
      },
    ],
  });
  const moderatorSummary = moderatorResponse.content[0].type === "text" ? moderatorResponse.content[0].text : "";

  const check = await prisma.realityCheck.create({
    data: {
      solutionHypothesisId,
      coldInvestor,
      honestFriend,
      socraticQ,
      moderatorSummary,
      inputContext: context,
    },
  });

  return NextResponse.json(check);
}
