"use client";

import { Check } from "lucide-react";

export type TabKey = "problem" | "solution";

export function MainTabs({
  active,
  onChange,
  problemConfirmed,
  problemTotal,
  activeSolutionCount,
  recommended,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  problemConfirmed: number;
  problemTotal: number;
  activeSolutionCount: number;
  recommended: TabKey | null;
}) {
  type Tab = {
    key: TabKey;
    label: string;
    indicator: "done" | "ratio" | "count" | "none";
    confirmed: number;
    total: number;
    count: number;
  };

  const tabs: Tab[] = [
    {
      key: "problem",
      label: "문제 검증",
      indicator:
        problemTotal > 0 && problemConfirmed === problemTotal ? "done" : "ratio",
      confirmed: problemConfirmed,
      total: problemTotal,
      count: 0,
    },
    {
      key: "solution",
      label: "솔루션 검증",
      indicator: activeSolutionCount > 0 ? "count" : "none",
      confirmed: 0,
      total: 0,
      count: activeSolutionCount,
    },
  ];

  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const isRecommended = recommended === tab.key && !isActive;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`relative flex-1 md:flex-none md:px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-tertiary hover:text-secondary"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              {tab.label}
              {tab.indicator === "done" && (
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100 text-green-700"
                  aria-label="완료"
                >
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
              {tab.indicator === "ratio" && (
                <span
                  className={`text-xs ${isActive ? "text-violet-500" : "text-subtle"}`}
                  aria-label={`${tab.confirmed} / ${tab.total} 확인`}
                >
                  {tab.confirmed}/{tab.total}
                </span>
              )}
              {tab.indicator === "count" && (
                <span
                  className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-semibold tabular-nums ${
                    isActive
                      ? "bg-violet-100 text-violet-700"
                      : "bg-wash text-tertiary"
                  }`}
                  aria-label={`활성 솔루션 ${tab.count}개`}
                >
                  {tab.count}
                </span>
              )}
              {isRecommended && (
                <span
                  className="absolute top-2 right-3 inline-block w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"
                  aria-label="다음 추천"
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
