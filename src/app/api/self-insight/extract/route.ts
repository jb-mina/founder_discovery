import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const client = new Anthropic();

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(10),
  sessionId: z.string(),
});

const ExtractResultSchema = z.discriminatedUnion("hasContent", [
  z.object({ hasContent: z.literal(false) }),
  z.object({
    hasContent: z.literal(true),
    entry: z.object({
      category: z.enum(["interests", "strengths", "aversions", "flow", "network", "other"]),
      question: z.string().min(1),
      answer: z.string().min(1),
      tags: z.string().default(""),
    }),
  }),
]);

const EXTRACT_SYSTEM = `당신은 대화에서 창업자의 자기 인식 정보를 추출하는 에이전트입니다.

주어진 대화 기록에서 창업자가 자신에 대해 의미있는 정보를 공유했는지 판단하세요.

의미있는 정보가 있으면:
{"hasContent": true, "entry": {"category": "interests|strengths|aversions|flow|network|other", "question": "에이전트가 한 질문", "answer": "창업자 답변의 핵심 요약 (1-2문장)", "tags": "태그1,태그2"}}

의미있는 정보가 없으면 (인사, 메타 대화, 아직 답변 없음):
{"hasContent": false}

반드시 JSON만 반환하세요. 마크다운 코드블록(\`\`\`)이나 다른 텍스트 없이.`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const inputResult = InputSchema.safeParse(body);
  if (!inputResult.success) {
    return NextResponse.json({ error: inputResult.error.issues }, { status: 400 });
  }
  const { messages } = inputResult.data;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    system: EXTRACT_SYSTEM,
    messages: [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: "위 대화에서 창업자의 자기 인식 정보를 추출하세요." },
    ],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "";
  const raw = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "extract JSON parse failed", raw }, { status: 500 });
  }

  const result = ExtractResultSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues, raw }, { status: 400 });
  }

  if (!result.data.hasContent) {
    return NextResponse.json({ hasContent: false }, { status: 200 });
  }

  const saved = await prisma.selfMapEntry.create({
    data: {
      category: result.data.entry.category,
      question: result.data.entry.question,
      answer: result.data.entry.answer,
      tags: result.data.entry.tags,
    },
  });

  return NextResponse.json({ hasContent: true, entry: saved }, { status: 201 });
}
