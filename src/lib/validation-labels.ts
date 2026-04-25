import type { HypothesisAxis, ValidationMethod } from "@/lib/agents/validation-designer/schema";

export const AXIS_LABELS: Record<HypothesisAxis, string> = {
  existence: "문제 존재 여부",
  severity: "심각도",
  fit: "솔루션 핏",
  willingness: "지불 의사",
};

export const AXIS_DESCRIPTIONS: Record<HypothesisAxis, string> = {
  existence: "솔루션 무관하게, 이 문제가 실제로 존재하는가",
  severity: "그 문제가 돈을 낼 만큼 아픈가",
  fit: "이 솔루션이 그 문제를 충분히 해결하는가",
  willingness: "그 해결에 돈을 낼 의사가 있는가",
};

export const METHOD_LABELS: Record<ValidationMethod, string> = {
  interview: "인터뷰",
  observation: "관찰",
  smoke_test: "스모크 테스트",
  fake_door: "페이크 도어",
  prepayment: "소액 선결제",
  concierge: "컨시어지 PoC",
};

export type HypothesisStatus = "not_started" | "in_progress" | "broken" | "confirmed";

export const HYPOTHESIS_STATUS_LABELS: Record<HypothesisStatus, string> = {
  not_started: "시작 전",
  in_progress: "진행 중",
  broken: "깨짐",
  confirmed: "확인됨",
};

export const HYPOTHESIS_STATUS_VARIANTS: Record<
  HypothesisStatus,
  "default" | "violet" | "green" | "amber" | "red" | "blue"
> = {
  not_started: "default",
  in_progress: "amber",
  broken: "red",
  confirmed: "green",
};

export type SolutionStatus = "active" | "shelved" | "confirmed" | "broken";

export const SOLUTION_STATUS_LABELS: Record<SolutionStatus, string> = {
  active: "활성",
  shelved: "보류",
  confirmed: "확인됨",
  broken: "깨짐",
};

export const SOLUTION_STATUS_VARIANTS: Record<
  SolutionStatus,
  "default" | "violet" | "green" | "amber" | "red" | "blue"
> = {
  active: "violet",
  shelved: "default",
  confirmed: "green",
  broken: "red",
};

export function parsePrescribedMethods(json: string): ValidationMethod[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ValidationMethod =>
        typeof m === "string" &&
        ["interview", "observation", "smoke_test", "fake_door", "prepayment", "concierge"].includes(m),
    );
  } catch {
    return [];
  }
}
