"use client";

import { useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";

type Candidate = { statement: string; angle: string };

export function SolutionInputForm({
  problemCardId,
  onClose,
  onSaved,
}: {
  problemCardId: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [statement, setStatement] = useState("");
  const [origin, setOrigin] = useState<"manual" | "ai_suggested">("manual");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function fetchCandidates() {
    setLoadingCandidates(true);
    setCandidatesError(null);
    try {
      const res = await fetch("/api/solution-hypotheses/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemCardId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.details || body.error || "후보 생성 실패");
      }
      const data = (await res.json()) as { candidates: Candidate[] };
      setCandidates(data.candidates);
    } catch (err) {
      setCandidatesError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingCandidates(false);
    }
  }

  function pickCandidate(c: Candidate) {
    setStatement(c.statement);
    setOrigin("ai_suggested");
  }

  async function save() {
    if (statement.trim().length < 10) {
      setSaveError("최소 10자 이상의 솔루션 가설을 입력해 주세요");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/solution-hypotheses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemCardId, statement, source: origin }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.details || body.error || "저장 실패");
      }
      await onSaved();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-xl flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-sm text-foreground">솔루션 가설 추가</h2>
            <p className="text-xs text-muted mt-0.5">
              직접 입력하거나, 에이전트 후보 3개를 받아 골라 편집할 수 있습니다. 저장 시 fit·지불 의사 검증 처방이 자동 생성됩니다.
            </p>
          </div>
          <button onClick={onClose} className="text-subtle hover:text-secondary p-1" aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Suggester area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted">에이전트 후보</p>
              {candidates.length === 0 && !loadingCandidates && (
                <button
                  onClick={fetchCandidates}
                  className="flex items-center gap-1 text-xs rounded-lg border border-border bg-canvas px-2.5 py-1 text-secondary hover:bg-wash"
                >
                  <Sparkles size={12} /> 후보 3개 받기
                </button>
              )}
              {loadingCandidates && (
                <span className="flex items-center gap-1 text-xs text-violet-600">
                  <Loader2 size={12} className="animate-spin" /> 생성 중 (~10초)
                </span>
              )}
            </div>
            {candidatesError && (
              <p className="text-xs text-red-600">{candidatesError}</p>
            )}
            {candidates.length > 0 && (
              <div className="space-y-2">
                {candidates.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => pickCandidate(c)}
                    className="w-full text-left rounded-lg border border-border bg-canvas hover:border-violet-300 hover:bg-violet-50/40 p-3 transition-colors"
                  >
                    <p className="text-xs text-violet-700 font-medium mb-1">후보 {i + 1} — {c.angle}</p>
                    <p className="text-sm text-body whitespace-pre-wrap">{c.statement}</p>
                  </button>
                ))}
                <button
                  onClick={() => {
                    setCandidates([]);
                    setCandidatesError(null);
                  }}
                  className="text-xs text-subtle hover:text-secondary"
                >
                  후보 닫기
                </button>
              </div>
            )}
          </div>

          {/* Statement input */}
          <div>
            <p className="text-xs text-muted mb-2">
              솔루션 가설 statement
              {origin === "ai_suggested" && (
                <span className="ml-1.5 inline-flex items-center gap-1 text-violet-600">
                  <Sparkles size={10} /> 에이전트 후보 기반
                </span>
              )}
            </p>
            <textarea
              value={statement}
              onChange={(e) => {
                setStatement(e.target.value);
                if (origin === "ai_suggested" && e.target.value.length === 0) setOrigin("manual");
                if (saveError) setSaveError(null);
              }}
              rows={6}
              placeholder="누가 어떤 상황에서 무엇을 하는 솔루션인지 1~3문장으로. 검증 대상 가설입니다 (답이 아님)."
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
            />
            {saveError && <p className="text-xs text-red-600 mt-1">{saveError}</p>}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end gap-2 bg-canvas">
          <button
            onClick={onClose}
            className="text-sm rounded-lg border border-border px-3 py-2 text-secondary hover:bg-wash"
          >
            취소
          </button>
          <button
            onClick={save}
            disabled={saving || statement.trim().length < 10}
            className="flex items-center gap-1.5 text-sm rounded-lg bg-violet-600 px-3 py-2 text-white hover:bg-violet-500 disabled:opacity-40"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            저장 (검증 처방 생성)
          </button>
        </div>
      </div>
    </div>
  );
}
