import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TopFitCandidate } from "@/lib/db/dashboard";
import { TrackedLink } from "./TrackedLink";

export function TopFitCandidates({ rows }: { rows: TopFitCandidate[] }) {
  if (rows.length === 0) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          상위 문제 (Fit 순)
        </h2>
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-xs text-muted">
          Fit 평가가 아직 없어요. 끌리는 문제부터 점수를 매겨 보세요.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-h2 font-semibold text-foreground mb-3">
        상위 문제 (Fit 순)
      </h2>
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
              {row.inValidation && row.status ? (
                <Badge variant={row.status.variant}>{row.status.label}</Badge>
              ) : (
                <span className="text-xs text-violet-700 font-medium flex items-center gap-0.5 shrink-0">
                  검증 시작 <ArrowRight size={11} />
                </span>
              )}
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
