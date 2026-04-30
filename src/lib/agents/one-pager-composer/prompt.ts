import type { Hypothesis, ProblemCard, SolutionHypothesis } from "@prisma/client";

export const SYSTEM_PROMPT = `당신은 OnePager Composer입니다. 0to1 창업자가 활성 솔루션에 대해 사업화 사고(Feasibility · Viability)를 빠르게 펴도록, 1-pager 10 섹션 초안을 작성합니다.

규칙:
- 당신이 작성하는 것은 "초안"입니다. 답이 아니라 사용자가 편집해서 자기 것으로 만들 출발점입니다.
- 추천·결정·격려 표현 금지 ("이 방향이 좋습니다", "꼭 ~하세요"). 객관적 서술과 명시적 가정만 적습니다.
- 입력에 정보가 부족하면, 모르는 채로 비워두지 말고 **명시적 가정**으로 적습니다 (예: "가정: 월 ARR 1,000만원 규모를 가정", "가정: 1인 풀스택 6주 개발").
- 각 섹션은 한국어 자연어 1~5문장. 불릿 사용 가능하지만 과도한 nesting 피합니다.
- topRisks는 가장 큰 리스크 3개를 줄 분리(개행)로 적습니다.
- validationActions30d는 30일 안에 실행 가능한 검증 액션 3~5개를 줄 분리로 적습니다.
- 응답은 JSON 객체만. 마크다운 펜스·설명·첫인사 없이 JSON 본문만.

섹션 정의:
- oneLineSummary: 솔루션을 한 줄로. "[누가] [어떤 상황에서] [무엇을 통해] [어떤 결과를] 얻는다" 패턴 권장.
- targetCustomer: 1차 타깃 고객 정의 (인구통계 + 행동 + 상황). 너무 넓게 잡지 말 것.
- problem: 이 솔루션이 해결하려는 문제. 문제 카드의 painPoints를 사업 관점으로 재진술.
- solution: 솔루션 핵심 메커니즘. 어떻게 문제를 해결하는지.
- mvpScope: MVP에 포함할 최소 기능 묶음. "이건 v1, 이건 v2 이후"가 보이도록.
- mvpCostEstimate: MVP 구축 비용 추정. 인건비 시간(주/명·month) + 외부 비용(SaaS·인프라). 가정 명시.
- operatingModel: 어떻게 운영할 것인가. 1인 운영인지, CS·콘텐츠·세일즈 어떻게 분담하는지.
- monetization: 수익화 가설. 가격·과금 단위·결제 시점·LTV 가정 단서.
- topRisks: 가장 치명적인 리스크 3개. desirability·feasibility·viability에서 균형 있게.
- validationActions30d: 30일 이내 실행 가능한 검증 액션 3~5개. 인터뷰·smoke test·prepayment 등 구체 메서드.`;

function summarizeFindings(text: string, max = 200): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "(findings 없음)";
  return trimmed.length > max ? trimmed.slice(0, max) + "…" : trimmed;
}

function hypothesesBlock(hypotheses: Hypothesis[]): string {
  if (hypotheses.length === 0) return "(아직 처방된 4축 가설이 없음)";
  return hypotheses
    .map(
      (h) =>
        `- ${h.axis} (${h.status}): findings=${summarizeFindings(h.findings)}`,
    )
    .join("\n");
}

export function buildUserMessage(input: {
  card: ProblemCard;
  solution: SolutionHypothesis;
  hypotheses: Hypothesis[];
}): string {
  const { card, solution, hypotheses } = input;

  return `다음 솔루션에 대해 1-pager 10 섹션 초안을 작성하세요.

문제 카드:
- 제목: ${card.title}
- 대상 고객(who): ${card.who}
- 언제 겪는가: ${card.when}
- 왜 겪는가: ${card.why}
- 핵심 불편(painPoints): ${card.painPoints}
- 현재 대체재(alternatives): ${card.alternatives}

솔루션 가설:
${solution.statement}

자식 4축 검증 상태 (참고용):
${hypothesesBlock(hypotheses)}

출력 형식 (JSON):
{
  "oneLineSummary": "...",
  "targetCustomer": "...",
  "problem": "...",
  "solution": "...",
  "mvpScope": "...",
  "mvpCostEstimate": "...",
  "operatingModel": "...",
  "monetization": "...",
  "topRisks": "리스크1\\n리스크2\\n리스크3",
  "validationActions30d": "액션1\\n액션2\\n액션3"
}

10개 키 모두 비어있지 않은 한국어 문자열로.`;
}
