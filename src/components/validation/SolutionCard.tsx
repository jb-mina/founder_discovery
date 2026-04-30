"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import {
  SOLUTION_STATUS_LABELS,
  SOLUTION_STATUS_VARIANTS,
  type SolutionStatus,
} from "@/lib/validation-labels";

export type SolutionCardData = {
  id: string;
  statement: string;
  source: string;
  status: string;
  hypothesesConfirmed: number;
  hypothesesTotal: number;
};

// Compact card for INACTIVE solutions (shelved / broken / confirmed) shown in
// SolutionPanel's accordion. Active solutions are surfaced as full work
// spaces by SolutionValidationBlock, not via this card.
export function SolutionCard({
  solution,
  onClick,
}: {
  solution: SolutionCardData;
  onClick: () => void;
}) {
  const status = solution.status as SolutionStatus;
  const isAi = solution.source === "ai_suggested";

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:border-border-strong hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-2 mb-1.5">
        <Badge variant={SOLUTION_STATUS_VARIANTS[status]}>{SOLUTION_STATUS_LABELS[status]}</Badge>
        {isAi && (
          <span className="inline-flex items-center gap-1 text-xs text-tertiary">
            <Sparkles size={10} /> 에이전트 후보
          </span>
        )}
      </div>
      <p className="text-sm text-body line-clamp-3 whitespace-pre-wrap">{solution.statement}</p>
    </Card>
  );
}
