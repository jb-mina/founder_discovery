"use client";

import { useState } from "react";
import { Loader2, Pencil, X } from "lucide-react";

export type ProblemDetailData = {
  title: string;
  who: string;
  when: string;
  why: string;
  painPoints: string;
  alternatives: string;
};

const FIELDS: { key: keyof ProblemDetailData; label: string; multiline: boolean }[] = [
  { key: "title", label: "제목", multiline: false },
  { key: "who", label: "타깃 고객 (who)", multiline: true },
  { key: "when", label: "언제 겪는가 (when)", multiline: true },
  { key: "why", label: "왜 겪는가 (why)", multiline: true },
  { key: "painPoints", label: "핵심 불편 (painPoints)", multiline: true },
  { key: "alternatives", label: "현재 대체재", multiline: true },
];

export function ProblemDetailModal({
  problemCardId,
  problem,
  onClose,
  onUpdated,
}: {
  problemCardId: string;
  problem: ProblemDetailData;
  onClose: () => void;
  onUpdated?: () => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProblemDetailData>(problem);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(problem);
    setError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(problem);
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/problems/${problemCardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `저장 실패 (${res.status})`);
      }
      await onUpdated?.();
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-2xl flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">문제 카드</p>
            <h2 className="font-semibold text-base text-foreground mt-0.5 line-clamp-2">
              {editing ? draft.title : problem.title}
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!editing && (
              <button
                onClick={startEdit}
                className="flex items-center gap-1 text-xs text-tertiary hover:text-violet-600 px-2 py-1 rounded-md"
                title="문제 카드 편집"
              >
                <Pencil size={14} /> 편집
              </button>
            )}
            <button onClick={onClose} className="text-subtle hover:text-secondary p-1" aria-label="닫기">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <p className="text-xs text-muted mb-1">{f.label}</p>
              {editing ? (
                f.multiline ? (
                  <textarea
                    value={draft[f.key]}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    rows={Math.max(2, Math.min(6, draft[f.key].split("\n").length + 1))}
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
                  />
                ) : (
                  <input
                    type="text"
                    value={draft[f.key]}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                )
              ) : (
                <p className="text-sm text-body whitespace-pre-wrap">{problem[f.key] || "—"}</p>
              )}
            </div>
          ))}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {editing && (
          <div className="px-5 py-3 border-t border-border flex justify-end gap-2 bg-wash/40">
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="text-xs rounded-md border border-border bg-canvas hover:bg-wash px-3 py-1.5 text-tertiary disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={save}
              disabled={saving || !draft.title.trim()}
              className="flex items-center gap-1.5 text-xs rounded-md bg-violet-600 text-white px-3 py-1.5 hover:bg-violet-500 disabled:opacity-60"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
