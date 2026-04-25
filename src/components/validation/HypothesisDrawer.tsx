"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

export type DrawerHypothesis = {
  id: string;
  axis: string;
  status: string;
  prescribedMethods: string;
  successSignals: string;
  failureSignals: string;
  findings: string;
};

const STATUS_OPTIONS: HypothesisStatus[] = ["not_started", "in_progress", "broken", "confirmed"];

type ContextChip = { label: string; value: string };

export function HypothesisDrawer({
  hypothesis,
  contextChips,
  onClose,
  onUpdated,
}: {
  hypothesis: DrawerHypothesis | null;
  contextChips: ContextChip[];
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
}) {
  const [findings, setFindings] = useState("");
  const [status, setStatus] = useState<HypothesisStatus>("not_started");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (hypothesis) {
      setFindings(hypothesis.findings ?? "");
      setStatus(hypothesis.status as HypothesisStatus);
    }
  }, [hypothesis]);

  if (!hypothesis) return null;

  const axis = hypothesis.axis as HypothesisAxis;
  const methods = parsePrescribedMethods(hypothesis.prescribedMethods);

  async function save() {
    if (!hypothesis) return;
    setSaving(true);
    await fetch(`/api/hypotheses/${hypothesis.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, findings }),
    });
    setSaving(false);
    await onUpdated();
    onClose();
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 bottom-0 w-full md:w-[480px] bg-surface border-l border-border z-50 shadow-xl flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Sticky context */}
        <div className="px-5 py-3 border-b border-border bg-canvas">
          <div className="flex flex-wrap items-center gap-1.5">
            {contextChips.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1 rounded-full bg-surface border border-border text-xs px-2 py-0.5 text-tertiary"
              >
                <span className="text-subtle">{c.label}:</span> {c.value}
              </span>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted">검증 가설</p>
            <h2 className="text-base font-semibold text-foreground">{AXIS_LABELS[axis]}</h2>
            <p className="text-xs text-muted mt-0.5">{AXIS_DESCRIPTIONS[axis]}</p>
          </div>
          <button
            onClick={onClose}
            className="text-subtle hover:text-secondary p-1"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Status */}
          <div>
            <p className="text-xs text-muted mb-2">진행 상태</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`text-xs rounded-lg border px-2.5 py-1.5 transition-colors ${
                    status === s
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-border bg-canvas text-tertiary hover:bg-wash"
                  }`}
                >
                  {HYPOTHESIS_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            {status !== (hypothesis.status as HypothesisStatus) && (
              <p className="text-xs text-violet-600 mt-1.5">
                현재: <Badge variant={HYPOTHESIS_STATUS_VARIANTS[hypothesis.status as HypothesisStatus]}>{HYPOTHESIS_STATUS_LABELS[hypothesis.status as HypothesisStatus]}</Badge> → 저장 시 변경됨
              </p>
            )}
          </div>

          {/* Prescribed methods */}
          <div>
            <p className="text-xs text-muted mb-2">추천 검증 메서드 (우선순위 순)</p>
            {methods.length > 0 ? (
              <ul className="space-y-1.5">
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
          <div className="grid grid-cols-1 gap-2.5">
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
            <p className="text-xs text-muted mb-2">findings (관찰·인터뷰 결과)</p>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              rows={6}
              placeholder="검증에서 관찰한 사실·발견. (정식 LearningLog는 Phase 2 도입 예정)"
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2 bg-canvas">
          <button
            onClick={onClose}
            className="text-sm rounded-lg border border-border px-3 py-2 text-secondary hover:bg-wash"
          >
            취소
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm rounded-lg bg-violet-600 px-3 py-2 text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            저장
          </button>
        </div>
      </aside>
    </>
  );
}
