export const PROBLEM_CATEGORY_GROUPS = [
  {
    id: "health",
    label: "헬스 & 웰빙",
    items: ["건강/헬스케어", "멘탈헬스", "식품/음식", "운동/피트니스"],
  },
  {
    id: "lifestyle",
    label: "일상 & 라이프스타일",
    items: ["여행", "반려동물", "패션/뷰티", "주거/부동산", "가족/육아"],
  },
  {
    id: "work",
    label: "일 & 커리어",
    items: ["생산성", "커리어", "채용/HR", "원격근무/협업"],
  },
  {
    id: "learning",
    label: "학습 & 교육",
    items: ["교육", "자기계발/평생학습"],
  },
  {
    id: "money",
    label: "돈 & 핀테크",
    items: ["재무/핀테크", "투자/자산관리", "세금/회계"],
  },
  {
    id: "b2b",
    label: "B2B & 개발",
    items: ["B2B/SaaS", "개발자도구", "마케팅/세일즈", "데이터/분석"],
  },
  {
    id: "media",
    label: "미디어 & 크리에이터",
    items: ["크리에이터 이코노미", "엔터테인먼트", "콘텐츠 제작/편집", "게임"],
  },
  {
    id: "society",
    label: "커머스 & 사회",
    items: ["쇼핑/커머스", "환경/지속가능성", "시니어/돌봄"],
  },
  {
    id: "frontier",
    label: "신흥 & 프론티어",
    items: ["AI/자동화", "Web3/크립토", "바이오/딥테크"],
  },
] as const;

export const PROBLEM_CATEGORIES: readonly string[] = PROBLEM_CATEGORY_GROUPS.flatMap(
  (g) => g.items,
);

export type ProblemCategory = (typeof PROBLEM_CATEGORY_GROUPS)[number]["items"][number];

export function isProblemCategory(value: string): value is ProblemCategory {
  return (PROBLEM_CATEGORIES as readonly string[]).includes(value);
}

export function normalizeProblemCategory(value: string | null | undefined): string {
  if (!value) return "";
  return isProblemCategory(value) ? value : "";
}
