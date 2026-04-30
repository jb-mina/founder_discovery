import { ArrowRight, Compass } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StepperBar } from "@/components/validation/StepperBar";
import type { AccumulatedLearning, NorthStarFocus } from "@/lib/db/dashboard";
import { TrackedLink } from "./TrackedLink";

export function NorthStarBar({
  focus,
  accumulated,
}: {
  focus: NorthStarFocus;
  accumulated: AccumulatedLearning;
}) {
  if (!focus) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-h2 font-semibold text-foreground flex items-center gap-1.5">
              <Compass size={16} className="text-violet-600" />
              북극성 확신
            </p>
            <p className="text-xs text-muted mt-1">
              활성 솔루션이 아직 없어요. 검증 시작하면 가장 가까운 가설의 진행도가 여기에 보입니다.
            </p>
          </div>
          <TrackedLink
            href="/validation"
            widget="north_star_focus"
            className="flex items-center gap-1 text-xs text-foreground hover:text-violet-600 shrink-0"
          >
            검증으로 <ArrowRight size={12} />
          </TrackedLink>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <TrackedLink
        href={`/validation/${focus.problemCardId}`}
        widget="north_star_focus"
        className="block group"
      >
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <p className="text-h2 font-semibold text-foreground flex items-center gap-1.5">
            <Compass size={16} className="text-violet-600" />
            북극성 확신
          </p>
          <p className="text-h2 font-semibold text-violet-700 tabular-nums">
            {focus.confirmed}/{focus.total}
          </p>
        </div>
        <p className="text-xs text-muted mb-1">지금 가장 가까운 가설</p>
        <p className="text-sm font-medium text-foreground truncate group-hover:text-violet-700 mb-1">
          {focus.problemTitle}
        </p>
        <p className="text-xs text-tertiary truncate mb-3">
          {focus.solutionStatement}
        </p>
        <StepperBar steps={focus.steps} />
      </TrackedLink>

      <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="text-subtle">전체 학습 누적</span>
        <span>
          확인 <span className="text-green-700 font-semibold">{accumulated.confirmedAxes}</span>
        </span>
        <span>
          깨짐 <span className="text-red-700 font-semibold">{accumulated.brokenAxes}</span>
        </span>
        <span>
          진행 중 <span className="text-amber-700 font-semibold">{accumulated.inProgressAxes}</span>
        </span>
      </div>

      <TrackedLink
        href={`/validation/${focus.problemCardId}`}
        widget="north_star_focus"
        className="mt-4 flex items-center justify-center gap-1.5 w-full rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors px-4 py-2.5 text-sm font-medium text-white"
      >
        {focus.nextActionLabel}
        <ArrowRight size={14} />
      </TrackedLink>
    </Card>
  );
}

export function focusProgressBucket(
  focus: NorthStarFocus,
): "0" | "1" | "2" | "3" | "4" | undefined {
  if (!focus) return undefined;
  const n = Math.max(0, Math.min(4, focus.confirmed));
  return String(n) as "0" | "1" | "2" | "3" | "4";
}
