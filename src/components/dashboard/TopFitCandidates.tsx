import { ArrowRight } from "lucide-react";
import type { TopFitCandidate } from "@/lib/db/dashboard";
import { TrackedLink } from "./TrackedLink";

export function TopFitCandidates({ rows }: { rows: TopFitCandidate[] }) {
  if (rows.length === 0) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-h2 font-semibold text-foreground">
          다음 검증 후보{" "}
          <span className="text-subtle font-normal">(Fit 순)</span>
        </h2>
        <p className="text-xs text-muted">검증 미시작 · Fit 평가 완료</p>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <TrackedLink
            key={row.problemCardId}
            href={`/validation/${row.problemCardId}`}
            widget="top_fit"
            className="block"
          >
            <div className="flex items-center gap-3 bg-surface rounded-lg px-4 py-3 border border-border shadow-sm hover:border-border-strong transition-colors">
              <span className="text-sm font-bold text-subtle w-5">
                #{i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {row.title}
                </p>
                <p className="text-xs text-muted truncate">{row.who}</p>
              </div>
              <span className="text-xs text-violet-700 font-medium flex items-center gap-0.5 shrink-0">
                검증 시작 <ArrowRight size={11} />
              </span>
              <span className="text-sm font-semibold text-amber-600 w-10 text-right">
                {row.totalScore.toFixed(1)}
              </span>
            </div>
          </TrackedLink>
        ))}
      </div>
    </div>
  );
}
