import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic();

const SYSTEM = `당신은 Self Insight Agent입니다. 창업자(사용자)가 자신을 깊이 이해하도록 돕는 전담 코치입니다.

역할:
- 사용자의 관심사, 강점, 혐오하는 것, 몰입 경험, 경력, 접근 가능한 네트워크를 자연스럽게 끌어냅니다
- 한 번에 하나의 질문만 합니다. 절대 여러 질문을 동시에 하지 마세요
- 답변을 듣고 더 깊이 파고드는 후속 질문을 합니다
- 공감하며 대화하되, 막연한 칭찬은 피합니다
- 답변에서 패턴이나 인사이트가 보이면 반영해줍니다

카테고리 (자연스럽게 탐색):
- interests: 무엇에 끌리는지, 시간 가는 줄 모르고 하는 것
- strengths: 남들보다 잘하는 것, 칭찬받는 것
- aversions: 절대 하고 싶지 않은 것, 에너지를 빼앗는 것
- flow: 완전히 몰입했던 경험, 그 때 무엇이 좋았는지
- network: 접근 가능한 사람들, 특정 분야의 인맥

응답 형식: 자연스러운 한국어로 대화하세요. 응답 끝에 반드시 다음 JSON을 포함하세요:
---SAVE---
{"category": "카테고리명", "question": "방금 한 질문", "answer": "사용자의 답변 요약", "tags": "태그1,태그2"}
---END---

만약 아직 저장할 내용이 없거나 대화를 시작하는 경우라면 ---SAVE--- 블록을 포함하지 마세요.`;

export async function POST(req: NextRequest) {
  const { messages, sessionId } = await req.json();

  const selfMapEntries = await prisma.selfMapEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const contextSummary = selfMapEntries.length > 0
    ? `\n\n현재까지 파악된 Self Map:\n${selfMapEntries.map(e => `[${e.category}] Q: ${e.question} / A: ${e.answer}`).join("\n")}`
    : "\n\n아직 Self Map 데이터가 없습니다. 첫 번째 질문을 시작하세요.";

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM + contextSummary,
    messages,
  });

  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        let fullText = "";
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            fullText += chunk.delta.text;
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }

        // Parse and save to DB
        const saveMatch = fullText.match(/---SAVE---\s*([\s\S]*?)\s*---END---/);
        if (saveMatch) {
          try {
            const data = JSON.parse(saveMatch[1]);
            if (data.answer && data.answer.trim()) {
              await prisma.selfMapEntry.create({
                data: {
                  category: data.category || "other",
                  question: data.question || "",
                  answer: data.answer,
                  tags: data.tags || "",
                },
              });
            }
          } catch {}
        }

        // Save conversation
        if (sessionId) {
          const lastUserMsg = messages[messages.length - 1];
          if (lastUserMsg?.role === "user") {
            await prisma.agentConversation.createMany({
              data: [
                { agentType: "self-insight", role: "user", content: lastUserMsg.content, sessionId },
                { agentType: "self-insight", role: "assistant", content: fullText, sessionId },
              ],
            });
          }
        }

        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}
