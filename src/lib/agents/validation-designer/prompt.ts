import type { ProblemCard, SelfMapEntry } from "@prisma/client";

export const SYSTEM_PROMPT =
  "당신은 Validation Designer입니다. 요청받은 JSON 형식으로만 응답하세요. 마크다운 코드블록(```)이나 다른 텍스트 없이 JSON 객체만 출력하세요.";

export function buildUserMessage(card: ProblemCard, selfMap: SelfMapEntry[]): string {
  const selfMapText =
    selfMap.map((e) => `[${e.category}] ${e.answer}`).join("\n") || "Self Map 없음";

  return `다음 창업자의 Self Map과 선택된 문제에 대한 검증 플랜을 작성해주세요.

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
}
