import type { ProblemCard, SolutionHypothesis } from "@prisma/client";
import type { HypothesisAxis, ValidationMethod } from "@/lib/agents/validation-designer/schema";

export const SYSTEM_PROMPT = `당신은 Method Coach입니다. 0to1 창업자가 검증 메서드를 처방받았을 때, 그 메서드를 **오늘 당장 실행**할 수 있도록 구체적인 가이드를 짜는 역할입니다.

규칙:
- 일반론(예: "고객을 만나세요") 금지. 이 문제 카드의 타깃·맥락에 맞는 **구체적인** 액션·문구를 작성합니다.
- 결정은 사용자가 합니다. 가이드는 **실행 frame + 템플릿 raw material**까지만. 최종 질문지·카피·가격은 사용자가 채울 수 있게 빈칸 또는 옵션 형태로 남겨도 됩니다.
- 메서드별 template 차별화:
  - interview: 유도 질문 금지, 사실/사례 위주의 5~7개 open question. "최근 X를 겪은 가장 마지막 순간을 자세히 설명해주세요" 같은 회상형 우선.
  - observation: 어디서·언제·무엇을 기록할지. 관찰 일지 칼럼 제안.
  - smoke_test: 랜딩 헤드라인 / sub-copy / CTA 버튼 라벨 / 측정할 지표.
  - fake_door: 가짜 기능 surface 위치 + 클릭 시 보여줄 문구 + 측정 방법.
  - prepayment: 제안할 가격 + 결제 시점 + 환불 정책 + ask 메시지 1개.
  - concierge: 수동으로 어떻게 배송/제공할지 script + 5명 ask 메시지.
- sampleSize는 0to1 단계에 적절한 수(인터뷰 5~10명, 결제 시도 3~5건 등). 과도하지 않게.
- channels는 한국 0to1 창업자가 실제 접근 가능한 곳(오픈채팅, DISQUIET, Threads, 지인 1·2차, 커뮤니티 X) 중심.
- watchOuts는 이 문제·메서드 조합에서 흔히 빠지는 함정 1~3문장.
- 응답은 JSON 객체만. 마크다운 펜스·설명·인사 없이 본문만.`;

const AXIS_LABELS: Record<HypothesisAxis, string> = {
  existence: "문제 존재 여부 (솔루션과 무관하게 이 문제가 실제로 발생하는가)",
  severity: "심각도 (이 문제에 돈/시간을 낼 만큼 아픈가)",
  fit: "솔루션 핏 (이 솔루션이 그 문제를 충분히 해결하는가)",
  willingness: "지불 의사 (그 해결에 돈을 낼 의사가 있는가)",
};

const METHOD_LABELS: Record<ValidationMethod, string> = {
  interview: "인터뷰",
  observation: "관찰",
  smoke_test: "스모크 테스트 (랜딩 페이지)",
  fake_door: "페이크 도어",
  prepayment: "소액 선결제",
  concierge: "컨시어지 PoC",
};

export function buildUserMessage(input: {
  card: ProblemCard;
  axis: HypothesisAxis;
  method: ValidationMethod;
  successSignals: string;
  failureSignals: string;
  findings: string;
  solution?: Pick<SolutionHypothesis, "statement"> | null;
}): string {
  const { card, axis, method, successSignals, failureSignals, findings, solution } = input;

  const solutionBlock = solution?.statement
    ? `\n검증 대상 솔루션 가설:\n${solution.statement}\n`
    : "";

  const findingsBlock = findings && findings.trim().length > 0
    ? `\n이미 누적된 findings (참고용 — 같은 길로 빠지지 않게):\n${findings.slice(0, 600)}\n`
    : "";

  return `다음 (문제 카드 × 검증 축 × 메서드) 조합으로 **오늘 실행 가능한 가이드**를 작성하세요.

문제 카드:
- 제목: ${card.title}
- 대상 고객(who): ${card.who}
- 언제 겪는가(when): ${card.when}
- 왜 겪는가(why): ${card.why}
- 핵심 불편(painPoints): ${card.painPoints}
- 현재 대체재(alternatives): ${card.alternatives}
${solutionBlock}
검증 축: ${AXIS_LABELS[axis]}
메서드: ${METHOD_LABELS[method]}

이 축에서 처방된 시그널:
- 성공 시그널: ${successSignals || "(미입력)"}
- 실패 시그널: ${failureSignals || "(미입력)"}
${findingsBlock}
출력 형식 (JSON):
{
  "steps": ["1단계: ...", "2단계: ...", "3단계: ..."],
  "template": "메서드별 raw material (markdown 가능). 인터뷰면 질문 5~7개, 선결제면 가격·ask 메시지 등.",
  "sampleSize": "예: 10명 / 결제 시도 5건",
  "channels": ["오픈채팅 X", "DISQUIET", "지인 1차"],
  "timeEstimate": "예: 1주차 섭외, 2주차 실행 — 1명 30분",
  "watchOuts": "흔한 함정 1~3문장"
}

steps는 3~6개. channels는 1~5개. 모든 필드는 이 문제·메서드에 specific해야 함 (다른 문제에 그대로 붙여도 통하면 너무 일반적).`;
}
