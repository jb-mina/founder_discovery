import { Brain, Crosshair, Scale, Search, Beaker } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { LoopFlow as LoopFlowData, LoopStage } from "@/lib/db/dashboard";
import { TrackedLink } from "./TrackedLink";

type Node = {
  stage: LoopStage;
  label: string;
  href: string;
  icon: typeof Brain;
};

const NODES: Node[] = [
  { stage: "self_map", label: "Self Map", href: "/self-map", icon: Brain },
  { stage: "problems", label: "Problem Universe", href: "/problems", icon: Crosshair },
  { stage: "fit", label: "Founder-Problem Fit", href: "/problems", icon: Scale },
  { stage: "problem_validation", label: "문제 검증", href: "/validation", icon: Search },
  { stage: "solution_validation", label: "솔루션 검증", href: "/validation", icon: Beaker },
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
      <p className="text-h2 font-semibold text-foreground mb-4">0to1 루프</p>
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
                  <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center rounded-full bg-violet-600 text-white text-xs font-semibold px-1.5 py-0.5">
                    지금
                  </span>
                )}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon
                    size={14}
                    className={isCurrent ? "text-violet-700" : "text-subtle"}
                  />
                  <span className="text-xs font-semibold text-foreground truncate">
                    {node.label}
                  </span>
                </div>
                <p
                  className={`text-h2 font-bold tabular-nums ${
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
