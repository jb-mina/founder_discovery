import { Check, X, Circle, CircleDot } from "lucide-react";
import type { HypothesisAxis } from "@/lib/agents/validation-designer/schema";
import { AXIS_LABELS, type HypothesisStatus } from "@/lib/validation-labels";

const SHORT_LABELS: Record<HypothesisAxis, string> = {
  existence: "존재",
  severity: "심각도",
  fit: "핏",
  willingness: "지불",
};

function StepIcon({ status }: { status: HypothesisStatus }) {
  if (status === "confirmed")
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 border border-green-300">
        <Check size={12} strokeWidth={3} />
      </span>
    );
  if (status === "broken")
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 border border-red-300">
        <X size={12} strokeWidth={3} />
      </span>
    );
  if (status === "in_progress")
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
        <CircleDot size={12} strokeWidth={2.5} />
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-wash text-subtle border border-border">
      <Circle size={10} strokeWidth={2} />
    </span>
  );
}

export type StepperItem = { axis: HypothesisAxis; status: string };

export function StepperBar({ steps }: { steps: StepperItem[] }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.axis} className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <StepIcon status={step.status as HypothesisStatus} />
            <div className="min-w-0">
              <p className="text-[10px] text-subtle leading-none">{i + 1}</p>
              <p className="text-xs text-tertiary leading-tight truncate">
                <span className="hidden sm:inline">{AXIS_LABELS[step.axis]}</span>
                <span className="sm:hidden">{SHORT_LABELS[step.axis]}</span>
              </p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <span
              className={`flex-1 h-px min-w-[8px] ${
                step.status === "confirmed" ? "bg-green-300" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
