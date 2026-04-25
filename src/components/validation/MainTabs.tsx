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
  const tabs: { key: TabKey; label: string; subtitle: string; isDone: boolean }[] = [
    {
      key: "problem",
      label: "문제 검증",
      subtitle: `${problemConfirmed}/${problemTotal}`,
      isDone: problemTotal > 0 && problemConfirmed === problemTotal,
    },
    {
      key: "solution",
      label: "솔루션 검증",
      subtitle: activeSolutionCount > 0 ? `활성 ${activeSolutionCount}` : "",
      isDone: false,
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
              {tab.isDone ? (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-100 text-green-700">
                  <Check size={10} strokeWidth={3} />
                </span>
              ) : tab.subtitle ? (
                <span className={`text-xs ${isActive ? "text-violet-500" : "text-subtle"}`}>
                  {tab.subtitle}
                </span>
              ) : null}
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
