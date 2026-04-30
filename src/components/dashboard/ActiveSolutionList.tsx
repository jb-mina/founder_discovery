import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StepperBar } from "@/components/validation/StepperBar";
import type { ActiveSolutionRow } from "@/lib/db/dashboard";
import { TrackedLink } from "./TrackedLink";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

export function ActiveSolutionList({ rows }: { rows: ActiveSolutionRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div>
      <h2 className="text-h2 font-semibold text-foreground mb-3">
        진행 중인 솔루션 <span className="text-subtle font-normal">({rows.length})</span>
      </h2>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <TrackedLink
            key={row.solutionHypothesisId}
            href={`/validation/${row.problemCardId}`}
            widget="active_solution"
            className="block"
          >
            <Card className="hover:border-border-strong hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-foreground truncate">
                    {row.problemTitle}
                  </p>
                  <p className="text-xs text-muted truncate mt-0.5">
                    {row.solutionStatement}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge
                    variant={row.confirmed === row.total ? "green" : "violet"}
                  >
                    확인 {row.confirmed}/{row.total}
                  </Badge>
                  <span className="text-xs text-subtle">
                    {timeAgo(row.updatedAt)}
                  </span>
                </div>
              </div>
              <StepperBar steps={row.steps} />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted">{row.nextStep}</p>
                <span className="flex items-center gap-1 text-xs text-foreground">
                  보기 <ArrowRight size={12} />
                </span>
              </div>
            </Card>
          </TrackedLink>
        ))}
      </div>
    </div>
  );
}
