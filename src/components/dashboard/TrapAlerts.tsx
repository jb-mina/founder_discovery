import { AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TrapSignal } from "@/lib/db/dashboard";
import { TrackedLink } from "./TrackedLink";

const AXIS_KO: Record<"existence" | "severity", string> = {
  existence: "존재 여부",
  severity: "심각도",
};

export function TrapAlerts({ signals }: { signals: TrapSignal[] }) {
  if (signals.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-subtle">
        <ShieldCheck size={14} className="text-green-600" />
        현재 감지된 함정 없음
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-600" />
        <p className="text-sm font-semibold text-amber-700">함정 경보</p>
      </div>
      {signals.map((signal, i) => {
        if (signal.kind === "trap_solution_drift") {
          const missing = signal.missingAxes.map((a) => AXIS_KO[a]).join(" · ");
          return (
            <TrackedLink
              key={`${signal.kind}-${i}`}
              href={`/validation/${signal.problemCardId}`}
              widget="trap_alert"
              trapKind="trap_solution_drift"
              className="block"
            >
              <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 hover:bg-amber-100 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="amber">솔루션 끌림</Badge>
                    <span className="text-xs text-amber-700">미검증 {missing}</span>
                  </div>
                  <p className="text-sm text-foreground truncate">
                    {signal.problemTitle}
                  </p>
                </div>
                <ArrowRight size={12} className="text-amber-700 mt-0.5" />
              </div>
            </TrackedLink>
          );
        }
        return (
          <TrackedLink
            key={`${signal.kind}-${i}`}
            href={`/validation/${signal.problemCardId}`}
            widget="trap_alert"
            trapKind="trap_empathy_vs_payment"
            className="block"
          >
            <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 hover:bg-amber-100 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="amber">공감↔지불의사 혼동</Badge>
                  <span className="text-xs text-amber-700">
                    {signal.staleDays}일째 정체
                  </span>
                </div>
                <p className="text-sm text-foreground truncate">
                  {signal.solutionStatement}
                </p>
              </div>
              <ArrowRight size={12} className="text-amber-700 mt-0.5" />
            </div>
          </TrackedLink>
        );
      })}
    </div>
  );
}
