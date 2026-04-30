import { ArrowRight, Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { NextAction, TrapSignal } from "@/lib/db/dashboard";
import { TrackedLink } from "./TrackedLink";

const AXIS_KO: Record<"existence" | "severity", string> = {
  existence: "존재 여부",
  severity: "심각도",
};

function trapHref(trap: TrapSignal): string {
  return `/validation/${trap.problemCardId}`;
}

function trapLabel(trap: TrapSignal): { badge: string; meta: string; title: string } {
  if (trap.kind === "trap_solution_drift") {
    return {
      badge: "솔루션 끌림",
      meta: `미검증 ${trap.missingAxes.map((a) => AXIS_KO[a]).join(" · ")}`,
      title: trap.problemTitle,
    };
  }
  return {
    badge: "공감↔지불의사 혼동",
    meta: `${trap.staleDays}일째 정체`,
    title: trap.solutionStatement,
  };
}

// TodayCard merges "오늘의 다음 액션" and "함정 경보" into a single decision
// surface. The first trap (if any) becomes the headline action — sitting on a
// trap is more urgent than continuing in-progress work — and any remaining
// traps + the original next action sit underneath as smaller alerts.
export function TodayCard({
  nextAction,
  traps,
}: {
  nextAction: NextAction;
  traps: TrapSignal[];
}) {
  const headlineTrap = traps[0] ?? null;
  const restTraps = traps.slice(1);

  // Empty state — no nextAction and no traps.
  if (!nextAction && !headlineTrap) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted font-medium mb-0.5 flex items-center gap-1">
              <Sparkles size={12} /> 오늘
            </p>
            <p className="text-sm text-foreground">
              검증할 문제가 아직 없어요. 문제 카드를 둘러보고 Fit 평가부터 시작해보세요.
            </p>
          </div>
          <TrackedLink
            href="/problems"
            widget="next_action"
            className="flex items-center gap-1 text-xs text-foreground hover:text-violet-600 shrink-0 font-medium"
          >
            문제로 <ArrowRight size={12} />
          </TrackedLink>
        </div>
      </Card>
    );
  }

  if (headlineTrap) {
    const { badge, meta, title } = trapLabel(headlineTrap);
    return (
      <Card className="border-amber-200 bg-amber-50">
        <TrackedLink
          href={trapHref(headlineTrap)}
          widget="trap_alert"
          trapKind={headlineTrap.kind}
          className="block group"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-amber-700 font-medium mb-1 flex items-center gap-1">
                <AlertTriangle size={12} /> 오늘 — 함정 경보
              </p>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="amber">{badge}</Badge>
                <span className="text-xs text-amber-700">{meta}</span>
              </div>
              <p className="font-medium text-h2 text-foreground truncate group-hover:text-amber-800">
                {title}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {headlineTrap.kind === "trap_solution_drift"
                  ? "솔루션 등록 전에 문제 검증부터."
                  : "핏은 확인됐지만 지불 의사 검증이 멈춰 있어요."}
              </p>
            </div>
            <span className="flex items-center gap-1 text-xs text-amber-700 shrink-0 font-medium">
              지금 이동 <ArrowRight size={12} />
            </span>
          </div>
        </TrackedLink>

        {(restTraps.length > 0 || nextAction) && (
          <div className="mt-3 pt-3 border-t border-amber-200 space-y-1.5">
            {restTraps.map((trap, i) => {
              const { badge, meta, title } = trapLabel(trap);
              return (
                <TrackedLink
                  key={`trap-${i}`}
                  href={trapHref(trap)}
                  widget="trap_alert"
                  trapKind={trap.kind}
                  className="flex items-center gap-2 text-xs text-amber-800 hover:text-amber-900"
                >
                  <Badge variant="amber" className="shrink-0">{badge}</Badge>
                  <span className="text-amber-700 shrink-0">{meta}</span>
                  <span className="truncate text-foreground">{title}</span>
                  <ArrowRight size={11} className="shrink-0 ml-auto" />
                </TrackedLink>
              );
            })}
            {nextAction && (
              <TrackedLink
                href={`/validation/${nextAction.problemCardId}`}
                widget="next_action"
                className="flex items-center gap-2 text-xs text-tertiary hover:text-foreground"
              >
                <Sparkles size={11} className="shrink-0 text-violet-600" />
                <span className="text-muted shrink-0">다음 액션</span>
                <span className="truncate text-foreground">{nextAction.title}</span>
                <ArrowRight size={11} className="shrink-0 ml-auto" />
              </TrackedLink>
            )}
          </div>
        )}
      </Card>
    );
  }

  // No traps — surface the next action prominently.
  // Above guard guarantees nextAction is non-null here.
  const action = nextAction!;
  return (
    <Card className="border-violet-200 bg-violet-50">
      <TrackedLink
        href={`/validation/${action.problemCardId}`}
        widget="next_action"
        className="block group"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-violet-700 font-medium mb-1 flex items-center gap-1">
              <Sparkles size={12} /> 오늘의 다음 액션
            </p>
            <p className="font-medium text-h2 text-foreground truncate group-hover:text-violet-700">
              {action.title}
            </p>
            <p className="text-xs text-muted mt-0.5">{action.nextStep}</p>
          </div>
          <span className="flex items-center gap-1 text-xs text-violet-700 shrink-0 font-medium">
            지금 이동 <ArrowRight size={12} />
          </span>
        </div>
      </TrackedLink>

      <div className="mt-3 pt-3 border-t border-violet-200 flex items-center gap-1.5 text-xs text-subtle">
        <ShieldCheck size={12} className="text-green-600" />
        현재 감지된 함정 없음
      </div>
    </Card>
  );
}
