"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  AXIS_LABELS,
  AXIS_DESCRIPTIONS,
  HYPOTHESIS_STATUS_LABELS,
  METHOD_LABELS,
  parsePrescribedMethods,
  type HypothesisStatus,
} from "@/lib/validation-labels";
import type { HypothesisAxis } from "@/lib/agents/validation-designer/schema";

export type AxisWorkspaceData = {
  id: string;
  axis: string;
  status: string;
  prescribedMethods: string;
  successSignals: string;
  failureSignals: string;
  findings: string;
};

const STATUS_OPTIONS: HypothesisStatus[] = ["not_started", "in_progress", "broken", "confirmed"];

const STATUS_BUTTON_VARIANTS: Record<HypothesisStatus, string> = {
  not_started: "border-violet-300 bg-violet-50 text-violet-700",
  in_progress: "border-amber-300 bg-amber-50 text-amber-700",
  broken: "border-red-300 bg-red-50 text-red-700",
  confirmed: "border-green-300 bg-green-50 text-green-700",
};

export function AxisWorkspace({
  hypothesis,
  onUpdated,
  loadingPlaceholder,
  contextChip,
}: {
  hypothesis: AxisWorkspaceData | null;
  onUpdated: () => void | Promise<void>;
  loadingPlaceholder?: string;
  contextChip?: { label: string; value: string };
}) {
  const [findings, setFindings] = useState("");
  const [status, setStatus] = useState<HypothesisStatus>("not_started");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingFindings, setSavingFindings] = useState(false);

  useEffect(() => {
    if (hypothesis) {
      setFindings(hypothesis.findings ?? "");
      setStatus(hypothesis.status as HypothesisStatus);
    }
  }, [hypothesis]);

  if (!hypothesis) {
    return (
      <Card className="text-center py-8">
        <Loader2 size={16} className="mx-auto mb-2 animate-spin text-violet-500" />
        <p className="text-xs text-muted">{loadingPlaceholder ?? "처방 생성 중..."}</p>
      </Card>
    );
  }

  const axis = hypothesis.axis as HypothesisAxis;
  const methods = parsePrescribedMethods(hypothesis.prescribedMethods);

  async function changeStatus(next: HypothesisStatus) {
    if (!hypothesis || next === status) return;
    setStatus(next);
    setSavingStatus(true);
    await fetch(`/api/hypotheses/${hypothesis.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSavingStatus(false);
    await onUpdated();
  }

  async function saveFindings() {
    if (!hypothesis) return;
    setSavingFindings(true);
    await fetch(`/api/hypotheses/${hypothesis.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findings }),
    });
    setSavingFindings(false);
    await onUpdated();
  }

  return (
    <Card className="space-y-5">
      {contextChip && (
        <div className="inline-flex items-start gap-1 rounded-md bg-violet-50 border border-violet-200 px-2 py-1 text-xs text-violet-700 max-w-full">
          <span className="text-violet-500 shrink-0">{contextChip.label}</span>
          <span className="font-medium line-clamp-1 min-w-0">{contextChip.value}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <p className="text-xs text-muted">검증 가설</p>
        <h3 className="text-base font-semibold text-foreground">{AXIS_LABELS[axis]}</h3>
        <p className="text-xs text-muted mt-0.5">{AXIS_DESCRIPTIONS[axis]}</p>
      </div>

      {/* Status */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs text-muted">진행 상태</p>
          <p className="text-xs text-subtle">클릭해 변경</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              disabled={savingStatus}
              className={`text-xs rounded-lg border px-2.5 py-1.5 transition-colors disabled:opacity-50 ${
                status === s
                  ? STATUS_BUTTON_VARIANTS[s]
                  : "border-border bg-canvas text-tertiary hover:bg-wash"
              }`}
            >
              {HYPOTHESIS_STATUS_LABELS[s]}
            </button>
          ))}
          {savingStatus && <Loader2 size={12} className="animate-spin text-subtle self-center" />}
        </div>
      </div>

      {/* Methods */}
      <div>
        <p className="text-xs text-muted mb-2">추천 검증 메서드 (우선순위 순)</p>
        {methods.length > 0 ? (
          <ul className="space-y-1">
            {methods.map((m, i) => (
              <li key={m} className="flex items-start gap-2 text-sm">
                <span className="text-violet-600 font-medium shrink-0">{i + 1}.</span>
                <span className="text-body">{METHOD_LABELS[m]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-subtle">아직 처방되지 않음</p>
        )}
      </div>

      {/* Signals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-700 font-medium mb-1">성공 시그널</p>
          <p className="text-sm text-secondary whitespace-pre-wrap">{hypothesis.successSignals || "—"}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-700 font-medium mb-1">실패 시그널</p>
          <p className="text-sm text-secondary whitespace-pre-wrap">{hypothesis.failureSignals || "—"}</p>
        </div>
      </div>

      {/* Findings */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted">findings (관찰·인터뷰 결과)</p>
          {findings !== (hypothesis.findings ?? "") && (
            <button
              onClick={saveFindings}
              disabled={savingFindings}
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-500 font-medium disabled:opacity-50"
            >
              {savingFindings && <Loader2 size={10} className="animate-spin" />}
              저장
            </button>
          )}
        </div>
        <textarea
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          rows={4}
          placeholder="검증에서 관찰한 사실·발견. (정식 LearningLog는 Phase 2 도입 예정)"
          className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
        />
      </div>
    </Card>
  );
}
