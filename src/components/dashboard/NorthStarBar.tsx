import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { NorthStarSnapshot } from "@/lib/db/dashboard";
import { TrackedLink } from "./TrackedLink";

function ratio(num: number, denom: number): number {
  if (denom === 0) return 0;
  return Math.min(1, num / denom);
}

function Bar({ value, color }: { value: number; color: "green" | "violet" }) {
  const colorMap = {
    green: "bg-green-500",
    violet: "bg-violet-500",
  };
  return (
    <div className="h-2 w-full bg-wash rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${colorMap[color]}`}
        style={{ width: `${value * 100}%` }}
      />
    </div>
  );
}

export function NorthStarBar({ data }: { data: NorthStarSnapshot }) {
  const empty =
    data.problemTotal === 0 && data.solutionTotal === 0;

  if (empty) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-h2 font-semibold text-foreground">북극성 확신</p>
            <p className="text-xs text-muted mt-1">
              아직 검증된 가설이 없어요. 문제 카드부터 모아보세요.
            </p>
          </div>
          <TrackedLink
            href="/problems"
            widget="north_star_problem"
            className="flex items-center gap-1 text-xs text-foreground hover:text-violet-600 shrink-0"
          >
            문제 모으기 <ArrowRight size={12} />
          </TrackedLink>
        </div>
      </Card>
    );
  }

  const r1 = ratio(data.problemConfirmed, data.problemTotal);
  const r2 = ratio(data.solutionConfirmed, data.solutionTotal);

  return (
    <Card>
      <p className="text-h2 font-semibold text-foreground mb-4">북극성 확신</p>
      <div className="space-y-4">
        <TrackedLink
          href="/validation"
          widget="north_star_problem"
          className="block group"
        >
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <p className="text-sm font-medium text-foreground">1차 — 문제 확신</p>
            <p className="text-h2 font-semibold text-green-700 tabular-nums">
              {data.problemConfirmed}/{data.problemTotal}
            </p>
          </div>
          <Bar value={r1} color="green" />
          {data.latestProblemTitle && (
            <p className="text-xs text-muted mt-1.5 truncate group-hover:text-foreground">
              최근 확신: {data.latestProblemTitle}
            </p>
          )}
        </TrackedLink>

        <TrackedLink
          href="/validation"
          widget="north_star_solution"
          className="block group"
        >
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <p className="text-sm font-medium text-foreground">2차 — 솔루션 검증</p>
            <p className="text-h2 font-semibold text-violet-700 tabular-nums">
              {data.solutionConfirmed}/{data.solutionTotal}
            </p>
          </div>
          <Bar value={r2} color="violet" />
          {data.latestSolutionStatement && (
            <p className="text-xs text-muted mt-1.5 truncate group-hover:text-foreground">
              최근 확신: {data.latestSolutionStatement}
            </p>
          )}
        </TrackedLink>
      </div>
    </Card>
  );
}

export function ratioBucket(value: number): "0" | "lt50" | "gte50" {
  if (value === 0) return "0";
  if (value < 0.5) return "lt50";
  return "gte50";
}
