import type { ProblemCard, SelfMapEntry } from "@prisma/client";

export const SYSTEM_PROMPT = `당신은 Validation Designer입니다. 0to1 창업자가 가설을 가장 싸고 빠르게 깨도록 검증 처방을 설계합니다.

규칙:
- 솔루션 아이디어를 새로 생성하지 않습니다 (그건 Solution Suggester의 책임). 주어진 컨텍스트 위에서 검증 메서드와 시그널만 처방합니다.
- 가설(axis)별로 가장 적합한 검증 메서드 1~3개를 골라 우선순위대로 제시합니다.
- 메서드 선택지는 다음 6개 키만 사용: interview / observation / smoke_test / fake_door / prepayment / concierge.
- 성공 시그널과 실패 시그널은 관찰 가능한 행동·수치로 적습니다 (예: "10명 중 6명이 ~한다" / "이메일 응답률 < 5%").
- 응답은 JSON 객체만. 마크다운 펜스(\`\`\`)·설명·첫인사 없이 JSON 본문만 출력합니다.`;

function selfMapToText(selfMap: SelfMapEntry[]): string {
  if (selfMap.length === 0) return "Self Map 없음";
  return selfMap
    .slice(0, 10)
    .map((e) => `[${e.category}] ${e.answer}`)
    .join("\n");
}

function problemContext(card: ProblemCard): string {
  return `문제 카드:
- 제목: ${card.title}
- 대상 고객(who): ${card.who}
- 언제 겪는가: ${card.when}
- 왜 겪는가: ${card.why}
- 핵심 불편(painPoints): ${card.painPoints}
- 현재 대체재: ${card.alternatives}`;
}

const OUTPUT_SHAPE = `출력 형식 (JSON):
{
  "hypotheses": [
    {
      "axis": "existence" | "severity" | "fit" | "willingness",
      "prescribedMethods": ["interview", "smoke_test"],   // 1~3개, 우선순위 순
      "successSignals": "관찰 가능한 행동/수치로 작성",
      "failureSignals": "관찰 가능한 행동/수치로 작성"
    }
  ]
}`;

export function buildProblemAxisMessage(card: ProblemCard, selfMap: SelfMapEntry[]): string {
  return `다음 문제 카드에 대해 **문제 단위 가설 2개**(존재 여부 / 심각도) 검증 처방을 작성하세요.

이 단계의 목표:
- 솔루션 무관하게, 이 문제가 실제로 존재하는가? (existence)
- 그 문제가 돈을 낼 만큼 아픈가? (severity)

${problemContext(card)}

창업자 Self Map (참고용):
${selfMapToText(selfMap)}

${OUTPUT_SHAPE}

hypotheses 배열에는 정확히 2개 항목 — axis가 "existence"와 "severity"인 처방을 각각 하나씩.`;
}

export function buildSolutionAxisMessage(input: {
  card: ProblemCard;
  selfMap: SelfMapEntry[];
  solutionStatement: string;
  problemFindings?: string;
}): string {
  const { card, selfMap, solutionStatement, problemFindings } = input;
  const findingsBlock = problemFindings && problemFindings.trim().length > 0
    ? `\n문제 검증 단계에서 누적된 findings (참고용):\n${problemFindings.slice(0, 800)}\n`
    : "";

  return `다음 문제 카드와 솔루션 가설에 대해 **솔루션 단위 가설 2개**(솔루션 핏 / 지불 의사) 검증 처방을 작성하세요.

이 단계의 목표:
- 이 솔루션이 그 문제를 충분히 해결하는가? (fit)
- 그 해결에 돈을 낼 의사가 있는가? (willingness)
- 인터뷰 공감("저도 그래요")은 willingness 검증으로 부족합니다 — 실제 행동(스모크 테스트 클릭, 페이크 도어 결제 시도, 소액 선결제 등) 기반으로 처방하세요.

${problemContext(card)}

검증 대상 솔루션 가설:
${solutionStatement}
${findingsBlock}
창업자 Self Map (참고용):
${selfMapToText(selfMap)}

${OUTPUT_SHAPE}

hypotheses 배열에는 정확히 2개 항목 — axis가 "fit"와 "willingness"인 처방을 각각 하나씩.`;
}
