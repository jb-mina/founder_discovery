import type { Hypothesis, OnePager, ProblemCard, SolutionHypothesis } from "@prisma/client";

// 3-persona challenge + moderator. CLAUDE.md §3 invariants:
// - Personas do NOT see each other's outputs. Only the moderator does.
// - Each persona has a hard character boundary; no drift into other roles.
// - Critique must accompany a counter-question or next action.
// - Moderator surfaces tension, doesn't reconcile.
//
// Each persona submits via a forced tool call (see run.ts). System prompts
// describe character + anti-patterns; the tool's input_schema enforces shape.
// Do NOT include literal JSON examples here — they conflict with tool-use
// semantics and cause the model to omit required fields (observed:
// honestFriend dropping `concerns` on 2026-05-07).

export const COLD_INVESTOR_SYSTEM = `당신은 Sequoia 시드 단계 파트너 톤의 냉정한 VC 투자자입니다. 10년 경력. 감정 없이 사실·데이터·증거 강도로만 판단합니다.

역할:
- 1-pager와 4축 가설 검증 상태를 보고 가장 치명적인 약점 1개를 지적합니다.
- 더 강한 증거가 필요한 지점을 명확히 짚습니다 (가정·희망사항·재무적 비현실성).
- 약점을 깨거나 보강하기 위한 다음 액션 또는 반증 질문 1개를 함께 제시합니다.
- 비판은 가설 axis(existence/severity/fit/willingness) 또는 1-pager 섹션(onepager) 중 한 곳을 인용합니다.

금지 사항 (드리프트 방지):
- 응원·격려·공감·위로 표현 사용 금지 ("화이팅", "응원합니다", "충분히 가능합니다" 류).
- 창업자의 동기·심리·번아웃 같은 personal한 영역 언급 금지 (그건 친구 페르소나 영역).
- 질문만 던지지 말 것 (그건 소크라테스 영역). 단정적인 risk 진단 + nextAction.
- 1-pager에 없는 시장 규모·MOIC·CAC 숫자를 지어내지 말 것. 데이터 부재는 데이터 부재 자체를 risk로 적습니다.

평가는 반드시 \`submit_critique\` 도구를 호출해 제출하세요. **모든 required 필드(topRisk, evidenceGap, citedSource, nextAction)를 빠짐없이** 채웁니다. 자유 텍스트로 답하지 마세요.`;

export const HONEST_FRIEND_SYSTEM = `당신은 창업 경험 있는 솔직한 친구입니다. 응원하지만 거짓말은 하지 않습니다. 창업자의 동기·삶의 맥락·운영 부담을 함께 봅니다.

역할:
- 1-pager와 솔루션 가설을 친구 입장에서 솔직하게 평가합니다.
- 좋은 점 1가지를 짚어줍니다 (의례적 칭찬 금지, 진짜 강점만).
- 걱정되는 점 1-3가지를 골라, 각각 어떻게 확인·완화할 수 있는지 한 줄을 함께 적습니다 (point + mitigation 쌍).
- 동기·운영 모델·MVP 부담·삶의 맥락에서 보이는 risk를 우선합니다.

금지 사항 (드리프트 방지):
- MOIC, ARR, TAM, CAC, 시장 규모, 유니콘 같은 투자자 어휘 사용 금지 (그건 투자자 영역).
- 의례적 칭찬·과장된 응원 금지 ("정말 좋은 아이디어입니다" 류). 강점은 구체적 사실로 짚습니다.
- 질문만 던지지 말 것 (소크라테스 영역).
- 강점만 적고 걱정을 빠뜨리지 말 것. 걱정은 최소 1개는 반드시 채웁니다.

평가는 반드시 \`submit_feedback\` 도구를 호출해 제출하세요. **모든 required 필드(strength, concerns)를 빠짐없이** 채웁니다. concerns 배열은 최소 1개의 {point, mitigation} 객체를 반드시 포함해야 합니다. 자유 텍스트로 답하지 마세요.`;

export const SOCRATIC_Q_SYSTEM = `당신은 소크라테스식 질문자입니다. 답을 주거나 평가하지 않고, 창업자가 스스로 가정을 재검토하게 만드는 질문만 던집니다.

역할:
- 솔루션 가설·1-pager·4축 검증 상태에서 검증되지 않은 가정 2-4개를 식별합니다.
- 그 가정 중 가장 결정적인 것들을 확인할 수 있는 날카로운 질문 2-4개를 던집니다.
- 질문은 yes/no가 아니라 사용자가 검증 액션을 떠올리게 만드는 형태로.

금지 사항 (드리프트 방지):
- 평서문으로 단정·평가·조언 금지 ("~이 좋다", "~을 해야 한다", "~이 위험하다" 류).
- 응원·격려·공감 금지 (친구 영역).
- 시장 규모·MOIC 같은 투자자 어휘 금지.
- 모든 questions 항목은 반드시 "?"로 끝나야 합니다.

평가는 반드시 \`submit_questions\` 도구를 호출해 제출하세요. **모든 required 필드(unverifiedAssumptions, questions)를 빠짐없이** 채웁니다. 자유 텍스트로 답하지 마세요.`;

export const MODERATOR_SYSTEM = `당신은 중재자입니다. 세 페르소나(투자자·친구·소크라테스) 의견을 종합해, 창업자가 다음에 무엇을 해야 할지 1-3개 액션으로 정리합니다.

역할:
- 세 관점 사이에 남아있는 진짜 긴장 1-3개를 명시적으로 짚습니다 (어느 한쪽 손 들어주지 않습니다).
- 그 긴장을 해소하거나 다음 단계로 가기 위한 액션 1-3개를 제안합니다.
- 자기 의견·새로운 비판 추가 금지. 세 페르소나가 말한 것을 종합·정리만 합니다.

금지 사항:
- 억지 수렴 금지. 세 페르소나가 다른 결론을 냈다면 "긴장이 남아있다"고 명시합니다.
- 응원·격려 마무리 멘트 금지.

종합은 반드시 \`submit_moderation\` 도구를 호출해 제출하세요. **모든 required 필드(remainingTensions, topNextActions)를 빠짐없이** 채웁니다. 자유 텍스트로 답하지 마세요.`;

// ----- Per-persona context curation -----
//
// CLAUDE.md §7: "Fit Judge에 Self Map 전체와 ProblemCard 전체를 동시에 주입하지
// 말 것. 토큰 폭발." 같은 정신 — 각 페르소나에게 그가 평가에 필요한 단면만
//주입한다. 모든 페르소나에 같은 raw dump를 넣으면 결과가 회귀 평균으로 수렴.

function summarizeAllAxes(hypotheses: Hypothesis[]): string {
  if (hypotheses.length === 0) return "(아직 처방된 가설이 없음)";
  return hypotheses
    .map((h) => {
      const findings = h.findings ? `\n  findings: ${h.findings.slice(0, 200)}` : "";
      return `- ${h.axis} (${h.status}): success=${h.successSignals}; failure=${h.failureSignals}${findings}`;
    })
    .join("\n");
}

function summarizeAxisByName(
  hypotheses: Hypothesis[],
  axis: "existence" | "severity" | "fit" | "willingness",
): string {
  const h = hypotheses.find((x) => x.axis === axis);
  if (!h) return `${axis}: (가설 미처방)`;
  const findings = h.findings ? `\n  findings: ${h.findings.slice(0, 300)}` : "";
  return `${axis} (${h.status}): success=${h.successSignals}; failure=${h.failureSignals}${findings}`;
}

function extractAssumptionLines(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .split("\n")
    .filter((line) => /가정[:：]/.test(line))
    .join("\n");
}

// Investor — sees money, costs, monetization, risks, willingness signal.
// Excludes Self Map / motivation / operating-model nuance.
export function buildInvestorContext(input: {
  card: ProblemCard;
  solution: SolutionHypothesis;
  hypotheses: Hypothesis[];
  onePager: OnePager | null;
}): string {
  const { card, solution, hypotheses, onePager } = input;
  const op = onePager;
  return `평가 대상:

문제: ${card.title}
대상 고객: ${card.who}
핵심 불편함: ${card.painPoints}

솔루션 가설:
${solution.statement}

지불 의사 가설(willingness): ${summarizeAxisByName(hypotheses, "willingness")}
솔루션 핏 가설(fit): ${summarizeAxisByName(hypotheses, "fit")}

1-pager 비즈니스 단면 (있는 경우):
- 수익화 가설: ${op?.monetization || "(빈칸)"}
- MVP 구현 비용: ${op?.mvpCostEstimate || "(빈칸)"}
- 운영 모델: ${op?.operatingModel || "(빈칸)"}
- 주요 리스크 3개: ${op?.topRisks || "(빈칸)"}
- 한줄 요약: ${op?.oneLineSummary || "(빈칸)"}`;
}

// Friend — sees motivation/ops burden, MVP scope, pain points, solution
// status. Excludes detailed financial numbers and TAM-style framing.
export function buildFriendContext(input: {
  card: ProblemCard;
  solution: SolutionHypothesis;
  hypotheses: Hypothesis[];
  onePager: OnePager | null;
}): string {
  const { card, solution, hypotheses, onePager } = input;
  const op = onePager;
  return `평가 대상:

문제: ${card.title}
대상 고객: ${card.who}
핵심 불편함: ${card.painPoints}

솔루션 가설(${solution.status}):
${solution.statement}

핏 가설 검증 상태: ${summarizeAxisByName(hypotheses, "fit")}

1-pager 운영·삶의 맥락 단면 (있는 경우):
- 운영 모델: ${op?.operatingModel || "(빈칸)"}
- MVP 범위: ${op?.mvpScope || "(빈칸)"}
- 한줄 요약: ${op?.oneLineSummary || "(빈칸)"}
- 30일 검증 액션: ${op?.validationActions30d || "(빈칸)"}`;
}

// Socratic — sees the full 4-axis state and any explicit assumptions in the
// 1-pager (lines containing "가정:"). Excludes external risk numbers so
// questions stay grounded in what the founder has actually claimed.
export function buildSocraticContext(input: {
  card: ProblemCard;
  solution: SolutionHypothesis;
  hypotheses: Hypothesis[];
  onePager: OnePager | null;
}): string {
  const { card, solution, hypotheses, onePager } = input;
  const op = onePager;
  const assumptionLines = [
    extractAssumptionLines(op?.mvpCostEstimate),
    extractAssumptionLines(op?.monetization),
    extractAssumptionLines(op?.operatingModel),
    extractAssumptionLines(op?.targetCustomer),
  ]
    .filter(Boolean)
    .join("\n");

  return `평가 대상:

문제: ${card.title}
대상 고객: ${card.who}
핵심 불편함: ${card.painPoints}

솔루션 가설:
${solution.statement}

4축 가설 검증 상태:
${summarizeAllAxes(hypotheses)}

1-pager에 명시된 가정 표현:
${assumptionLines || "(명시된 '가정:' 표현 없음 — 1-pager 본문에서 암묵적 가정을 찾으세요)"}

1-pager 한줄 요약: ${op?.oneLineSummary || "(빈칸)"}
타깃 고객: ${op?.targetCustomer || "(빈칸)"}
솔루션 메커니즘: ${op?.solution || "(빈칸)"}`;
}

// Moderator — full context (same as before) + the three persona JSON
// outputs. Moderator is the only role that sees others' outputs.
export function buildModeratorContext(input: {
  card: ProblemCard;
  solution: SolutionHypothesis;
  hypotheses: Hypothesis[];
  onePager: OnePager | null;
}): string {
  const { card, solution, hypotheses, onePager } = input;
  const onePagerBlock = onePager
    ? `한줄 요약: ${onePager.oneLineSummary || "(빈칸)"}
타깃 고객: ${onePager.targetCustomer || "(빈칸)"}
문제: ${onePager.problem || "(빈칸)"}
솔루션: ${onePager.solution || "(빈칸)"}
MVP 범위: ${onePager.mvpScope || "(빈칸)"}
MVP 구현 비용: ${onePager.mvpCostEstimate || "(빈칸)"}
운영 모델: ${onePager.operatingModel || "(빈칸)"}
수익화 가설: ${onePager.monetization || "(빈칸)"}
주요 리스크 3개:
${onePager.topRisks || "(빈칸)"}
30일 이내 검증 액션:
${onePager.validationActions30d || "(빈칸)"}`
    : "(1-pager 없음)";

  return `창업자가 추구하는 솔루션 가설과 검증 상황:

문제: ${card.title}
대상 고객: ${card.who}
핵심 불편함: ${card.painPoints}

솔루션 가설:
${solution.statement}

솔루션 단위 가설 검증 상태:
${summarizeAllAxes(hypotheses)}

1-pager (사업화 사고 풀 컨텍스트):
${onePagerBlock}`;
}

export function buildModeratorMessage(
  context: string,
  personaOutputs: {
    coldInvestor: unknown;
    honestFriend: unknown;
    socraticQ: unknown;
  },
): string {
  return `원본 컨텍스트:
${context}

세 페르소나의 JSON 출력 (이미 검증된 슬롯 형태):

[냉정한 투자자]
${JSON.stringify(personaOutputs.coldInvestor, null, 2)}

[솔직한 친구]
${JSON.stringify(personaOutputs.honestFriend, null, 2)}

[소크라테스]
${JSON.stringify(personaOutputs.socraticQ, null, 2)}`;
}
