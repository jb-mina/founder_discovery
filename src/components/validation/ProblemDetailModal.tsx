"use client";

import { X } from "lucide-react";

export type ProblemDetailData = {
  title: string;
  who: string;
  when: string;
  why: string;
  painPoints: string;
  alternatives: string;
};

export function ProblemDetailModal({
  problem,
  onClose,
}: {
  problem: ProblemDetailData;
  onClose: () => void;
}) {
  const fields = [
    { label: "타깃 고객 (who)", value: problem.who },
    { label: "언제 겪는가 (when)", value: problem.when },
    { label: "왜 겪는가 (why)", value: problem.why },
    { label: "핵심 불편 (painPoints)", value: problem.painPoints },
    { label: "현재 대체재", value: problem.alternatives },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-2xl flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted">문제 카드</p>
            <h2 className="font-semibold text-base text-foreground mt-0.5">{problem.title}</h2>
          </div>
          <button onClick={onClose} className="text-subtle hover:text-secondary p-1" aria-label="닫기">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-xs text-muted mb-1">{f.label}</p>
              <p className="text-sm text-body whitespace-pre-wrap">{f.value || "—"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
