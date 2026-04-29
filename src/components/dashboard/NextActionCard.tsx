import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NextAction } from "@/lib/db/dashboard";
import { TrackedLink } from "./TrackedLink";

const PRIORITY_LABEL: Record<NonNullable<NextAction>["priority"], string> = {
  in_progress_problem: "진행 중인 문제 검증 이어가기",
  in_progress_solution: "진행 중인 솔루션 검증 이어가기",
  no_active_solution: "솔루션 가설 등록",
  problem_not_started: "문제 검증 시작",
  fit_top_candidate: "Fit 최고점 문제 검증 시작",
};

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
              검증할 문제가 아직 없어요. Fit 평가에서 가장 끌리는 문제부터 골라보세요.
            </p>
          </div>
          <TrackedLink
            href="/fit"
            widget="next_action"
            className="flex items-center gap-1 text-xs text-violet-700 hover:text-violet-600 shrink-0 font-medium"
          >
            Fit으로 <ArrowRight size={12} />
          </TrackedLink>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-violet-200 bg-violet-50">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-violet-700 font-medium flex items-center gap-1">
              <Sparkles size={12} /> 오늘의 다음 액션
            </p>
            <Badge variant="violet" className="text-[10px]">
              {PRIORITY_LABEL[action.priority]}
            </Badge>
          </div>
          <p className="font-medium text-sm text-foreground truncate">
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
