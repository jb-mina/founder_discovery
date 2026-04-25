"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Loader2 } from "lucide-react";
import {
  AXIS_LABELS,
  AXIS_DESCRIPTIONS,
  HYPOTHESIS_STATUS_LABELS,
  HYPOTHESIS_STATUS_VARIANTS,
  METHOD_LABELS,
  parsePrescribedMethods,
  type HypothesisStatus,
} from "@/lib/validation-labels";
import type { HypothesisAxis } from "@/lib/agents/validation-designer/schema";

export type HypothesisCardData = {
  id: string;
  axis: string;
  status: string;
  prescribedMethods: string;
  findings: string;
};

export function HypothesisCard({
  hypothesis,
  onClick,
}: {
  hypothesis: HypothesisCardData;
  onClick: () => void;
}) {
  const axis = hypothesis.axis as HypothesisAxis;
  const status = hypothesis.status as HypothesisStatus;
  const methods = parsePrescribedMethods(hypothesis.prescribedMethods);

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:border-border-strong hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-medium text-sm text-foreground">{AXIS_LABELS[axis]}</p>
          <p className="text-xs text-muted mt-0.5 line-clamp-1">{AXIS_DESCRIPTIONS[axis]}</p>
        </div>
        <Badge variant={HYPOTHESIS_STATUS_VARIANTS[status]}>{HYPOTHESIS_STATUS_LABELS[status]}</Badge>
      </div>

      {methods.length > 0 ? (
        <div className="flex flex-wrap gap-1 mb-2">
          {methods.map((m) => (
            <span
              key={m}
              className="inline-flex items-center rounded-md bg-wash text-xs text-secondary px-1.5 py-0.5 border border-border"
            >
              {METHOD_LABELS[m]}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-subtle mb-2">
          <Loader2 size={12} className="animate-spin" /> 처방 중...
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-tertiary line-clamp-1">
          {hypothesis.findings ? `📝 ${hypothesis.findings}` : "기록 없음"}
        </p>
        <ChevronRight size={14} className="text-subtle shrink-0" />
      </div>
    </Card>
  );
}
