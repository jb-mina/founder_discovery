"use client";

import { useState } from "react";
import { AlertTriangle, HelpCircle, Loader2, Scale, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AxisWorkspace, type AxisWorkspaceData } from "@/components/validation/AxisWorkspace";
import {
  SOLUTION_STATUS_LABELS,
  SOLUTION_STATUS_VARIANTS,
  type SolutionStatus,
} from "@/lib/validation-labels";

export type SolutionBlockData = {
  id: string;
  statement: string;
  source: string;
  status: string;
  fit: AxisWorkspaceData | null;
  willingness: AxisWorkspaceData | null;
  realityCheck: {
    id: string;
    coldInvestor: string;
    honestFriend: string;
    socraticQ: string;
    moderatorSummary: string;
    createdAt: string;
  } | null;
};

export function SolutionValidationBlock({
  solution,
  onChanged,
}: {
  solution: SolutionBlockData;
  onChanged: () => void | Promise<void>;
}) {
  const [shelving, setShelving] = useState(false);
  const [realityChecking, setRealityChecking] = useState(false);

  async function shelve() {
    setShelving(true);
    await fetch(`/api/solution-hypotheses/${solution.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "shelved" }),
    });
    await onChanged();
    setShelving(false);
  }

  async function runRealityCheck() {
    setRealityChecking(true);
    await fetch("/api/reality-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solutionHypothesisId: solution.id }),
    });
    await onChanged();
    setRealityChecking(false);
  }

  const status = solution.status as SolutionStatus;
  const isAi = solution.source === "ai_suggested";

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/30 p-4 md:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-violet-200/70">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant={SOLUTION_STATUS_VARIANTS[status]}>{SOLUTION_STATUS_LABELS[status]}</Badge>
            {isAi && (
              <span className="inline-flex items-center gap-1 text-xs text-tertiary">
                <Sparkles size={10} /> 에이전트 후보
              </span>
            )}
          </div>
          <p className="text-sm text-body whitespace-pre-wrap line-clamp-3">{solution.statement}</p>
        </div>
        {solution.status === "active" && (
          <button
            onClick={shelve}
            disabled={shelving}
            className="text-xs rounded-lg border border-border bg-canvas hover:bg-wash px-2.5 py-1 text-tertiary disabled:opacity-40 shrink-0"
          >
            {shelving ? <Loader2 size={12} className="animate-spin" /> : "보류"}
          </button>
        )}
      </div>

      {/* Broken banner */}
      {solution.status === "broken" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
          <AlertTriangle size={14} className="text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-700 font-medium">이 솔루션은 검증으로 깨졌습니다</p>
            <p className="text-xs text-red-600 mt-0.5">
              fit 또는 지불 의사 가설이 broken으로 결정됨. 새 솔루션 가설을 시도해보세요.
            </p>
          </div>
        </div>
      )}

      {/* Hypothesis workspaces */}
      <AxisWorkspace
        hypothesis={solution.fit}
        onUpdated={onChanged}
        loadingPlaceholder="처방 생성 중..."
      />
      <AxisWorkspace
        hypothesis={solution.willingness}
        onUpdated={onChanged}
        loadingPlaceholder="처방 생성 중..."
      />

      {/* Reality Check */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Reality Check</h3>
            <p className="text-xs text-muted line-clamp-1">이 솔루션 단위 챌린지 + 모더레이터 종합</p>
          </div>
          <button
            onClick={runRealityCheck}
            disabled={realityChecking}
            className="flex items-center gap-1.5 text-xs rounded-lg border border-border bg-canvas hover:bg-wash px-2.5 py-1.5 text-tertiary disabled:opacity-40 shrink-0"
          >
            {realityChecking ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            실행
          </button>
        </div>
        {solution.realityCheck ? (
          <RealityCheckPanel rc={solution.realityCheck} />
        ) : (
          <p className="text-xs text-subtle">아직 실행된 Reality Check이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

function RealityCheckPanel({
  rc,
}: {
  rc: NonNullable<SolutionBlockData["realityCheck"]>;
}) {
  return (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-canvas">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: Zap, label: "냉정한 투자자", content: rc.coldInvestor, color: "text-red-600" },
          { icon: AlertTriangle, label: "솔직한 친구", content: rc.honestFriend, color: "text-amber-600" },
          { icon: HelpCircle, label: "소크라테스", content: rc.socraticQ, color: "text-blue-600" },
        ].map(({ icon: Icon, label, content, color }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-3">
            <div className={`flex items-center gap-1 mb-2 ${color}`}>
              <Icon size={12} />
              <p className="text-xs font-medium">{label}</p>
            </div>
            <p className="text-xs text-secondary whitespace-pre-wrap">{content}</p>
          </div>
        ))}
      </div>
      <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
        <div className="flex items-center gap-1 mb-1 text-violet-600">
          <Scale size={12} />
          <p className="text-xs font-medium">중재자 종합</p>
        </div>
        <p className="text-sm text-body whitespace-pre-wrap">{rc.moderatorSummary}</p>
      </div>
    </div>
  );
}
