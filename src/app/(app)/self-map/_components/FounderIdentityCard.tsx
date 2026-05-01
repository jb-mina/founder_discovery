"use client";

import { useState } from "react";
import { Loader2, Pencil, RefreshCw, Sparkles } from "lucide-react";

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

export type SynthesisState =
  | { status: "loading" }
  | { status: "not_ready"; entryCount: number; threshold: number }
  | { status: "ready"; synthesis: Synthesis }
  | { status: "error"; message: string };

export function FounderIdentityCard({
  state,
  entries,
  refreshing,
  onRefresh,
  onPatchStatement,
  onCiteClick,
}: {
  state: SynthesisState;
  entries: SelfMapEntry[];
  refreshing: boolean;
  onRefresh: () => void;
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
          정체성 합성 중…
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
            ? `${remaining}개 더 답변하면 정체성 카드가 생겨요.`
            : "곧 정체성 카드가 생겨요."}
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
    <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-600" />
          <h3 className="text-sm font-semibold text-foreground">Founder Identity</h3>
          <span className="text-[10px] text-muted">(가설)</span>
          {isEdited && <span className="text-[10px] text-violet-600">편집됨</span>}
        </div>
        <div className="flex gap-1">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            title="다시 합성"
            className="p-1 text-subtle hover:text-violet-600 disabled:opacity-40 transition-colors rounded"
          >
            {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          </button>
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
