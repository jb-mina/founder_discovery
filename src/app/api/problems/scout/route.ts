import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM = `당신은 Problem Scout Agent입니다. 창업자가 탐색할 문제 카드를 발굴하는 리서처입니다.

역할:
- YC, Sequoia, a16z 포트폴리오 스타트업이 실제로 풀고 있는 문제를 분석합니다
- Product Hunt, 앱스토어 트렌드에서 문제를 식별합니다
- 각 문제를 창업자 관점에서 구조화합니다

사용자가 요청하면 다음 형식의 문제 카드를 JSON 배열로 반환하세요:
[
  {
    "title": "한 줄 문제 제목",
    "who": "누가 겪는가 (구체적인 페르소나)",
    "when": "언제 겪는가",
    "why": "왜 겪는가 (근본 원인)",
    "painPoints": "구체적인 불편함과 비용",
    "alternatives": "현재 대체재",
    "source": "yc | sequoia | a16z | producthunt | appstore | manual",
    "sourceUrl": "출처 URL (있다면)",
    "tags": "태그1,태그2",
    "stage": "seed | series-a",
    "category": "카테고리명"
  }
]

응답은 반드시 JSON 배열만 반환하세요. 설명 텍스트 없이.`;

export async function POST(req: NextRequest) {
  const { query } = await req.json();

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM,
    messages: [{ role: "user", content: query || "최근 YC W2025, S2025 배치 중 Consumer와 Productivity 카테고리에서 흥미로운 문제 5개를 발굴해줘." }],
  });

  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  );
}
