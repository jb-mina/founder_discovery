import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { NextAction } from "@/lib/db/dashboard";
import { TrackedLink } from "./TrackedLink";

export function NextActionCard({ action }: { action: NextAction }) {
  if (!action) {
    return (
      <Card className="border-violet-200 bg-violet-50">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-violet-700 font-medium mb-0.5 flex items-center gap-1">
              <Sparkles size={12} /> 오늘의 다음 액션
            </p>
            <p className="text-sm text-foreground">
              검증할 문제가 아직 없어요. 문제 카드를 둘러보고 Fit 평가부터 시작해보세요.
            </p>
          </div>
          <TrackedLink
            href="/problems"
            widget="next_action"
            className="flex items-center gap-1 text-xs text-violet-700 hover:text-violet-600 shrink-0 font-medium"
          >
            문제로 <ArrowRight size={12} />
          </TrackedLink>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-violet-200 bg-violet-50">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-violet-700 font-medium flex items-center gap-1 mb-1">
            <Sparkles size={12} /> 오늘의 다음 액션
          </p>
          <p className="font-medium text-h2 text-foreground truncate">
            {action.title}
          </p>
          <p className="text-xs text-muted mt-0.5">{action.nextStep}</p>
        </div>
        <TrackedLink
          href={`/validation/${action.problemCardId}`}
          widget="next_action"
          className="flex items-center gap-1 text-xs text-violet-700 hover:text-violet-600 shrink-0 font-medium"
        >
          지금 이동 <ArrowRight size={12} />
        </TrackedLink>
      </div>
    </Card>
  );
}
