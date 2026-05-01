"use client";

import { useState } from "react";
import { Loader2, Pencil, Sparkles } from "lucide-react";

type SelfMapEntry = { id: string; question: string; answer: string };

export type Synthesis = {
  id: string;
  identityStatement: string;
  userEditedStatement: string | null;
  citedEntryIds: string[];
  tensions: { entryIdA: string; entryIdB: string; description: string }[];
  gaps: { category: string; reason: string }[];
  dismissedTensionKeys: string[];
  clusterMeanings?: { category: string; oneLine: string }[];
  updatedAt: string;
};

// `cache_miss`는 직전 합성도 없는 상태(첫 합성 전). previousSynthesis가 있으면
// page.tsx에서 status=ready + outdated=true로 변환해 카드를 그리되 `이전 합성`
// 배지를 띄운다 — UI 컴포넌트는 ready만 다루면 되도록.
export type SynthesisState =
  | { status: "loading" }
  | { status: "not_ready"; entryCount: number; threshold: number }
  | { status: "cache_miss" }
  | { status: "ready"; synthesis: Synthesis; outdated: boolean }
  | { status: "error"; message: string };

export function FounderIdentityCard({
  state,
  entries,
  onPatchStatement,
  onCiteClick,
}: {
  state: SynthesisState;
  entries: SelfMapEntry[];
  onPatchStatement: (id: string, value: string | null) => Promise<void>;
  onCiteClick?: (entryId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  if (state.status === "loading") {
    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
        <div className="flex items-center gap-2 text-xs text-violet-700">
          <Loader2 size={14} className="animate-spin" />
          요약 불러오는 중…
        </div>
      </div>
    );
  }

  if (state.status === "not_ready") {
    const remaining = Math.max(0, state.threshold - state.entryCount);
    return (
      <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/30 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={14} className="text-violet-500" />
          <h3 className="text-sm font-semibold text-foreground">Founder Identity</h3>
        </div>
        <p className="text-xs text-muted">
          {remaining > 0
            ? `${remaining}개 더 답변하면 요약을 정리할 수 있어요.`
            : "곧 요약을 정리할 수 있어요."}
        </p>
      </div>
    );
  }

  if (state.status === "cache_miss") {
    return (
      <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/30 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={14} className="text-violet-500" />
          <h3 className="text-sm font-semibold text-foreground">Founder Identity</h3>
        </div>
        <p className="text-xs text-muted">
          상단 <span className="text-violet-600 font-medium">✨ 요약보기</span> 버튼을 누르면 인사이트를 정리해 드려요.
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 text-xs text-red-700">
        합성 실패: {state.message}
      </div>
    );
  }

  const synthesis = state.synthesis;
  const outdated = state.outdated;
  const displayed = synthesis.userEditedStatement ?? synthesis.identityStatement;
  const isEdited = synthesis.userEditedStatement != null;

  function startEdit() {
    setEditValue(displayed);
    setEditing(true);
  }

  async function saveEdit() {
    setSavingEdit(true);
    try {
      const trimmed = editValue.trim();
      await onPatchStatement(synthesis.id, trimmed.length > 0 ? trimmed : null);
      setEditing(false);
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className={`rounded-xl border p-4 ${outdated ? "border-amber-200 bg-amber-50/40" : "border-violet-200 bg-violet-50/50"}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles size={14} className="text-violet-600" />
          <h3 className="text-sm font-semibold text-foreground">Founder Identity</h3>
          <span className="text-[10px] text-muted">(가설)</span>
          {isEdited && <span className="text-[10px] text-violet-600">편집됨</span>}
          {outdated && (
            <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
              이전 요약 — 상단 ✨로 갱신
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {!editing && (
            <button
              onClick={startEdit}
              title="편집"
              className="p-1 text-subtle hover:text-violet-600 transition-colors rounded"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      </div>

      {!editing && (
        <p className="text-sm leading-relaxed text-body whitespace-pre-wrap">{displayed}</p>
      )}

      {editing && (
        <div className="space-y-2">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              disabled={savingEdit}
              className="flex-1 rounded-lg border border-border py-1.5 text-xs text-secondary hover:bg-canvas disabled:opacity-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={saveEdit}
              disabled={savingEdit}
              className="flex-1 rounded-lg bg-violet-600 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
            >
              {savingEdit ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>
      )}

      {!editing && synthesis.citedEntryIds.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {synthesis.citedEntryIds.map((id) => {
            const entry = entries.find((e) => e.id === id);
            const label = entry?.question ? entry.question.slice(0, 14) : id.slice(0, 6);
            return (
              <button
                key={id}
                onClick={() => onCiteClick?.(id)}
                className="text-[10px] rounded bg-violet-100 px-1.5 py-0.5 text-violet-700 hover:bg-violet-200 transition-colors"
              >
                근거: {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
