import type { ProblemCard, SelfMapEntry } from "@prisma/client";

export const SYSTEM_PROMPT = `당신은 Solution Suggester입니다. 0to1 창업자가 막막할 때 솔루션 가설 후보 3개를 던져 사고를 풀어주는 역할입니다.

규칙:
- 후보는 "검증 대상 가설"입니다. 답이 아니라 깨러 갈 가설로 적습니다.
- 3개는 서로 충분히 다른 각도여야 합니다 (같은 솔루션의 변주 X). 예: 다른 타깃, 다른 채널, 다른 가격 모델, 다른 핵심 수단.
- 기존에 등록된 솔루션 가설과 겹치지 않게 합니다.
- 각 statement는 1~3문장. "누가 어떤 상황에서 무엇을 하는 솔루션"이 명확해야 합니다.
- angle은 그 후보가 다른 후보와 어떻게 다른지 한 줄로 (예: "기존 대체재의 X를 뒤집음", "타깃을 Y로 좁힘").
- 응답은 JSON 객체만. 마크다운 펜스·설명·첫인사 없이 JSON 본문만.`;

function selfMapToText(selfMap: SelfMapEntry[]): string {
  if (selfMap.length === 0) return "Self Map 없음";
  return selfMap
    .slice(0, 10)
    .map((e) => `[${e.category}] ${e.answer}`)
    .join("\n");
}

export function buildUserMessage(input: {
  card: ProblemCard;
  selfMap: SelfMapEntry[];
  existingSolutions: string[];
  problemFindings?: string;
  userPrompt?: string;
}): string {
  const { card, selfMap, existingSolutions, problemFindings, userPrompt } = input;

  const existingBlock = existingSolutions.length > 0
    ? `\n이미 등록된 솔루션 가설 (이것들과는 다른 각도로):\n${existingSolutions.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n`
    : "";

  const findingsBlock = problemFindings && problemFindings.trim().length > 0
    ? `\n문제 검증 단계 findings (참고용, 후보가 이 증거에 부합하도록):\n${problemFindings.slice(0, 600)}\n`
    : "";

  // User-supplied requirements override defaults but never the problem
  // context. Self-determination principle: the agent still proposes 3
  // candidates as hypotheses; the user picks/edits/saves.
  const userPromptBlock = userPrompt && userPrompt.trim().length > 0
    ? `\n사용자 추가 요건·고려사항 (후보 생성 시 우선 반영. 단, 문제 카드 컨텍스트와 충돌하면 문제 카드가 우선):\n${userPrompt.trim().slice(0, 500)}\n`
    : "";

  return `다음 문제 카드에 대해 **솔루션 가설 후보 3개**를 제안하세요. 후보는 서로 다른 각도여야 합니다.

문제 카드:
- 제목: ${card.title}
- 대상 고객(who): ${card.who}
- 언제 겪는가: ${card.when}
- 왜 겪는가: ${card.why}
- 핵심 불편: ${card.painPoints}
- 현재 대체재: ${card.alternatives}
${existingBlock}${findingsBlock}${userPromptBlock}
창업자 Self Map (참고용 — 창업자의 강점·접근 가능 네트워크 등을 활용할 수 있는 후보면 가산점):
${selfMapToText(selfMap)}

출력 형식 (JSON):
{
  "candidates": [
    { "statement": "1~3문장 솔루션 가설", "angle": "이 후보의 차별점 한 줄" },
    { "statement": "...", "angle": "..." },
    { "statement": "...", "angle": "..." }
  ]
}

candidates 배열에는 정확히 3개.`;
}

export function buildMergeUserMessage(input: {
  card: ProblemCard;
  selfMap: SelfMapEntry[];
  existingSolutions: string[];
  problemFindings?: string;
  userPrompt?: string;
  mergeFrom: string[];
}): string {
  const { card, selfMap, existingSolutions, problemFindings, userPrompt, mergeFrom } = input;

  const existingBlock = existingSolutions.length > 0
    ? `\n이미 등록된 솔루션 가설 (이것들과는 다른 각도로):\n${existingSolutions.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n`
    : "";

  const findingsBlock = problemFindings && problemFindings.trim().length > 0
    ? `\n문제 검증 단계 findings (참고용, 결합 결과가 이 증거에 부합하도록):\n${problemFindings.slice(0, 600)}\n`
    : "";

  const userPromptBlock = userPrompt && userPrompt.trim().length > 0
    ? `\n사용자 추가 요건·고려사항 (결합 시 우선 반영. 단, 문제 카드 컨텍스트와 충돌하면 문제 카드가 우선):\n${userPrompt.trim().slice(0, 500)}\n`
    : "";

  const mergeBlock = mergeFrom
    .map((s, i) => `후보 ${i + 1}:\n${s}`)
    .join("\n\n");

  return `다음 ${mergeFrom.length}개의 솔루션 가설 후보를 **하나의 통합된 솔루션 가설**로 결합하세요. 각 후보의 핵심 mechanism·타깃·채널·가격 모델 중 어느 부분을 살리고 어느 부분을 빼는지 의식적으로 선택해, 일관된 단일 가설로 통합합니다. 후보들의 단순 나열·접속이 되지 않도록 합니다.

결합 대상 후보:
${mergeBlock}

문제 카드:
- 제목: ${card.title}
- 대상 고객(who): ${card.who}
- 언제 겪는가: ${card.when}
- 왜 겪는가: ${card.why}
- 핵심 불편: ${card.painPoints}
- 현재 대체재: ${card.alternatives}
${existingBlock}${findingsBlock}${userPromptBlock}
창업자 Self Map (참고용):
${selfMapToText(selfMap)}

규칙:
- 결과는 1개. 1~3문장의 단일 솔루션 가설.
- angle은 "어느 후보의 무엇을 살리고 무엇을 뺐는지" 한 줄로 (예: "후보 1의 시범 협업 메커니즘 + 후보 2의 사전 데이터 매칭").
- 답이 아니라 검증 대상 가설로 적습니다.

출력 형식 (JSON, 마크다운 펜스·설명 없이 본문만):
{
  "candidate": { "statement": "1~3문장 결합 솔루션 가설", "angle": "어느 후보의 무엇을 살리고 뺐는지 한 줄" }
}`;
}
