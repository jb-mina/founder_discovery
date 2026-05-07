import type { Hypothesis, OnePager, ProblemCard, SolutionHypothesis } from "@prisma/client";

// Reality Check eval fixtures. Each fixture is a self-contained {card,
// solution, hypotheses, onePager} bundle the eval script feeds straight
// into runRealityCheck() — no DB needed. Cover varied stages so we can
// see how persona drift shifts with context richness.

export type RealityCheckFixture = {
  name: string;
  card: ProblemCard;
  solution: SolutionHypothesis;
  hypotheses: Hypothesis[];
  onePager: OnePager | null;
};

const now = new Date("2026-05-07T00:00:00Z");

function makeCard(over: Partial<ProblemCard>): ProblemCard {
  return {
    id: "card-fx",
    title: "",
    who: "",
    when: "",
    why: "",
    painPoints: "",
    alternatives: "",
    source: "manual",
    sourceUrl: "",
    tags: "",
    stage: "",
    category: "",
    addedBy: "scout",
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

function makeSolution(over: Partial<SolutionHypothesis>): SolutionHypothesis {
  return {
    id: "sol-fx",
    problemCardId: "card-fx",
    statement: "",
    source: "manual",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

function makeHyp(over: Partial<Hypothesis> & { axis: string }): Hypothesis {
  const { axis, ...rest } = over;
  return {
    id: `hyp-${axis}`,
    axis,
    problemCardId: null,
    solutionHypothesisId: "sol-fx",
    prescribedMethods: "[]",
    successSignals: "",
    failureSignals: "",
    status: "not_started",
    findings: "",
    createdAt: now,
    updatedAt: now,
    ...rest,
  };
}

function makeOnePager(over: Partial<OnePager>): OnePager {
  return {
    id: "op-fx",
    solutionHypothesisId: "sol-fx",
    oneLineSummary: "",
    targetCustomer: "",
    problem: "",
    solution: "",
    mvpScope: "",
    mvpCostEstimate: "",
    operatingModel: "",
    monetization: "",
    topRisks: "",
    validationActions30d: "",
    draftGeneratedAt: now,
    lastEditedAt: now,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

// Fixture 1 — early validation, sparse 1-pager, no findings yet. Personas
// must say "evidence absent" instead of fabricating market numbers.
const earlyStage: RealityCheckFixture = {
  name: "early-stage-sparse",
  card: makeCard({
    title: "1인 SaaS 창업자가 첫 유료 고객 5명을 못 모은다",
    who: "월 MRR 0원~50만원 사이의 1인 B2B SaaS 창업자",
    painPoints: "런칭 후 3개월 동안 유료 전환이 0~2명. 트래픽은 있지만 결제 단계에서 이탈.",
  }),
  solution: makeSolution({
    statement: "결제 직전 단계에 1:1 무료 온보딩 콜을 자동 제안해 첫 유료 전환율을 올린다.",
  }),
  hypotheses: [
    makeHyp({
      axis: "fit",
      status: "not_started",
      successSignals: "콜 신청률 ≥30%, 콜 후 결제 전환 ≥50%",
      failureSignals: "콜 신청률 <10%",
    }),
    makeHyp({
      axis: "willingness",
      status: "not_started",
      successSignals: "콜 후 월 $29 plan 결제 발생",
      failureSignals: "콜 후에도 무료 플랜에 머무름",
    }),
  ],
  onePager: makeOnePager({
    oneLineSummary: "1인 SaaS 창업자가 결제 직전 1:1 콜을 통해 첫 유료 전환을 만든다",
    targetCustomer: "월 MRR 0~50만원의 1인 B2B SaaS 창업자",
    problem: "결제 단계 이탈률이 높음",
    solution: "결제 페이지에 1:1 콜 신청 위젯",
    mvpScope: "Calendly 연동 + Intercom 트리거",
    mvpCostEstimate: "가정: 1인 풀스택 2주 개발",
    operatingModel: "창업자 본인이 콜 진행",
    monetization: "기존 SaaS 가격 ($29/mo) 그대로",
    topRisks: "콜 시간 부담\n전환율 측정 어려움\n경쟁사 모방 쉬움",
    validationActions30d: "smoke test (위젯 클릭률)\n5명에게 직접 콜 진행",
  }),
};

// Fixture 2 — mid validation, partial findings, 1-pager filled. Personas
// have something to actually critique.
const midStage: RealityCheckFixture = {
  name: "mid-stage-with-findings",
  card: makeCard({
    title: "회사원이 퇴근 후 사이드 프로젝트를 시작하고도 2주 안에 멈춘다",
    who: "직장 5~10년차 회사원, 사이드 프로젝트로 창업 전환을 고려",
    painPoints: "에너지·동기 소진, 어디부터 해야할지 모름, 동료 부재로 외로움",
  }),
  solution: makeSolution({
    statement: "주 1회 90분 화상 코호트(4-6인) + AI 코치를 결합한 8주 프로그램으로 첫 유저 인터뷰까지 끝낸다.",
  }),
  hypotheses: [
    makeHyp({
      axis: "fit",
      status: "in_progress",
      successSignals: "8주 완주율 ≥70%, NPS ≥40",
      failureSignals: "4주 이전 이탈 ≥50%",
      findings: "프로토타입 코호트 6명 중 4명이 4주차까지 진행, 2명 이탈 (이유: 회사 야근 누적)",
    }),
    makeHyp({
      axis: "willingness",
      status: "in_progress",
      successSignals: "월 99,000원 / 8주 79만원 결제",
      failureSignals: "결제 의향 <30%",
      findings: "사전 결제 의향 인터뷰 8명 중 5명이 \"50만원 이하면 시도\"",
    }),
  ],
  onePager: makeOnePager({
    oneLineSummary: "회사원이 코호트+AI 코치로 사이드 프로젝트를 8주 안에 첫 인터뷰까지 끌고 간다",
    targetCustomer: "직장 5~10년차, 사이드 프로젝트 의향 있음, 가처분 시간 주 5시간 이하",
    problem: "에너지·동기 소진과 동료 부재",
    solution: "주 1회 90분 코호트 + AI 코치",
    mvpScope: "Discord + Notion + 자체 챗 인터페이스 v0",
    mvpCostEstimate: "가정: 코호트 운영 1인 + AI 코치 개발 6주",
    operatingModel: "코호트 운영자 1명 + AI 코치 비동기 운영",
    monetization: "8주 79만원 (가정: 코호트당 5명 → 매출 395만원)",
    topRisks: "회사원의 시간 확보가 가장 큰 변수\n8주 완주율이 결제 만족도를 결정\nAI 코치가 코호트 가치를 잠식할 수 있음",
    validationActions30d: "5명 사전 결제 smoke test\n현재 코호트 4주차 인터뷰\n경쟁사(예: ON THE FLY) 가격 조사",
  }),
};

// Fixture 3 — null 1-pager (degraded path). Tests the fallback prompt
// instructing personas to judge from solution + hypothesis state alone.
const noOnePager: RealityCheckFixture = {
  name: "no-one-pager-fallback",
  card: makeCard({
    title: "디자이너가 포트폴리오 사이트를 1주일 이상 미루고 끝내 안 만든다",
    who: "프리랜서 디자이너, 포트폴리오 갱신 의향 있음",
    painPoints: "디자인은 가능하지만 코드·배포에서 막힘. 6개월 이상 방치.",
  }),
  solution: makeSolution({
    statement: "Figma 파일을 업로드하면 24시간 안에 배포된 포트폴리오 사이트로 변환해주는 서비스.",
  }),
  hypotheses: [
    makeHyp({
      axis: "fit",
      status: "not_started",
      successSignals: "랜딩 → 업로드 전환율 ≥10%",
      failureSignals: "업로드 0건",
    }),
    makeHyp({
      axis: "willingness",
      status: "not_started",
      successSignals: "$49 일회성 결제 전환율 ≥20%",
      failureSignals: "결제 페이지 이탈 ≥90%",
    }),
  ],
  onePager: null,
};

export const FIXTURES: RealityCheckFixture[] = [earlyStage, midStage, noOnePager];
