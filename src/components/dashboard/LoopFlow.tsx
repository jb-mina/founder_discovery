import { Brain, Crosshair, Scale, Search, Beaker, RotateCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { LoopFlow as LoopFlowData, LoopStage } from "@/lib/db/dashboard";
import { TrackedLink } from "./TrackedLink";

type Node = {
  stage: LoopStage;
  label: string;
  caption: string;
  href: string;
  icon: typeof Brain;
};

const NODES: Node[] = [
  { stage: "self_map", label: "Self Map", caption: "나 이해하기", href: "/self-map", icon: Brain },
  { stage: "problems", label: "Problem Universe", caption: "문제 모으기", href: "/problems", icon: Crosshair },
  { stage: "fit", label: "Founder-Problem Fit", caption: "내 문제 고르기", href: "/fit", icon: Scale },
  { stage: "problem_validation", label: "문제 검증", caption: "존재·심각도", href: "/validation", icon: Search },
  { stage: "solution_validation", label: "솔루션 검증", caption: "핏·지불 의사", href: "/validation", icon: Beaker },
];

function countFor(stage: LoopStage, data: LoopFlowData): number {
  switch (stage) {
    case "self_map":
      return data.selfMapCount;
    case "problems":
      return data.problemCount;
    case "fit":
      return data.fitCount;
    case "problem_validation":
      return data.problemValidationCount;
    case "solution_validation":
      return data.solutionValidationCount;
  }
}

export function LoopFlow({ data }: { data: LoopFlowData }) {
  return (
    <Card>
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-sm font-semibold text-foreground">0to1 루프</p>
        <p className="text-[11px] text-subtle flex items-center gap-1">
          학습 역류로 다시 돌아옴 <RotateCw size={10} />
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {NODES.map((node) => {
          const Icon = node.icon;
          const count = countFor(node.stage, data);
          const isCurrent = node.stage === data.currentStage;
          return (
            <TrackedLink
              key={node.stage}
              href={node.href}
              widget="loop_stage"
              loopStage={node.stage}
              className="block"
            >
              <div
                className={`relative h-full rounded-lg border px-3 py-3 transition-colors ${
                  isCurrent
                    ? "border-violet-300 bg-violet-50"
                    : "border-border bg-surface hover:border-border-strong"
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center rounded-full bg-violet-600 text-white text-[9px] font-semibold px-1.5 py-0.5">
                    지금
                  </span>
                )}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon
                    size={14}
                    className={isCurrent ? "text-violet-700" : "text-subtle"}
                  />
                  <span className="text-[11px] font-semibold text-foreground truncate">
                    {node.label}
                  </span>
                </div>
                <p className="text-[10px] text-muted truncate">{node.caption}</p>
                <p
                  className={`text-xs font-bold mt-1.5 ${
                    isCurrent ? "text-violet-700" : "text-tertiary"
                  }`}
                >
                  {count}
                </p>
              </div>
            </TrackedLink>
          );
        })}
      </div>
    </Card>
  );
}
