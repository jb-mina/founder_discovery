"use client";

import { useState } from "react";
import { Check, GitMerge, Loader2, Sparkles, X } from "lucide-react";
import { track } from "@/lib/posthog/events";

type Candidate = { statement: string; angle: string };

// Each picked AI candidate becomes its own draft so the user can edit
// 1-3 in parallel and save them as separate SolutionHypothesis rows.
type CandidateDraft = { angle: string; statement: string };

export function SolutionInputForm({
  problemCardId,
  onClose,
  onSaved,
}: {
  problemCardId: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [manualStatement, setManualStatement] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [picked, setPicked] = useState<CandidateDraft[]>([]);
  // When non-null, `picked` holds the single merged result and `mergeOrigin`
  // remembers the source statements so the user can re-merge with the same
  // inputs. Reset to null whenever the user breaks out of the merged state.
  const [mergeOrigin, setMergeOrigin] = useState<string[] | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ done: number; total: number } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isPicking = picked.length > 0;
  const isMerged = mergeOrigin !== null;
  const USER_PROMPT_MAX = 500;
  const userPromptOverLimit = userPrompt.length > USER_PROMPT_MAX;

  async function fetchCandidates() {
    if (userPromptOverLimit) return;
    // Re-fetch resets prior picks — they're tied to the previous batch's
    // angles and would otherwise dangle in the "선택된 가설 편집" list.
    setPicked([]);
    setMergeOrigin(null);
    setMergeError(null);
    setLoadingCandidates(true);
    setCandidatesError(null);
    try {
      const trimmed = userPrompt.trim();
      const res = await fetch("/api/solution-hypotheses/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemCardId,
          ...(trimmed.length > 0 ? { userPrompt: trimmed } : {}),
        }),
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

  function isPicked(c: Candidate): number {
    if (isMerged) return -1;
    return picked.findIndex((p) => p.angle === c.angle && p.statement === c.statement);
  }

  function toggleCandidate(c: Candidate) {
    // Toggling a candidate while in merged state means the user wants to
    // start over from candidate selection — drop the merge and begin fresh.
    if (isMerged) {
      setMergeOrigin(null);
      setMergeError(null);
      setPicked([{ angle: c.angle, statement: c.statement }]);
      return;
    }
    const idx = picked.findIndex((p) => p.angle === c.angle);
    if (idx >= 0) {
      setPicked(picked.filter((_, i) => i !== idx));
    } else {
      setPicked([...picked, { angle: c.angle, statement: c.statement }]);
    }
  }

  function updatePicked(idx: number, statement: string) {
    setPicked(picked.map((p, i) => (i === idx ? { ...p, statement } : p)));
  }

  function removePicked(idx: number) {
    const next = picked.filter((_, i) => i !== idx);
    setPicked(next);
    if (next.length === 0) {
      setMergeOrigin(null);
      setMergeError(null);
    }
  }

  async function mergeSelected() {
    const sources = isMerged ? mergeOrigin! : picked.map((p) => p.statement.trim());
    if (sources.length < 2 || sources.length > 3) return;
    if (userPromptOverLimit) return;

    setMerging(true);
    setMergeError(null);
    track({
      event: "solution_hypothesis_merge_requested",
      props: { merge_from_count: sources.length as 2 | 3 },
    });
    try {
      const trimmed = userPrompt.trim();
      const res = await fetch("/api/solution-hypotheses/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemCardId,
          mergeFrom: sources,
          ...(trimmed.length > 0 ? { userPrompt: trimmed } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.details || body.error || "결합 생성 실패");
      }
      const data = (await res.json()) as { candidate: Candidate };
      setPicked([
        { angle: `결합 — ${data.candidate.angle}`, statement: data.candidate.statement },
      ]);
      setMergeOrigin(sources);
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : String(err));
    } finally {
      setMerging(false);
    }
  }

  function canSave(): boolean {
    if (isPicking) {
      return picked.every((p) => p.statement.trim().length >= 10);
    }
    return manualStatement.trim().length >= 10;
  }

  async function save() {
    if (!canSave()) {
      setSaveError("각 솔루션 가설은 10자 이상이어야 합니다");
      return;
    }
    setSaving(true);
    setSaveError(null);

    const pickedSource: "ai_suggested" | "ai_merged" = isMerged ? "ai_merged" : "ai_suggested";
    const drafts: { statement: string; source: "manual" | "ai_suggested" | "ai_merged" }[] = isPicking
      ? picked.map((p) => ({ statement: p.statement.trim(), source: pickedSource }))
      : [{ statement: manualStatement.trim(), source: "manual" }];

    setSaveProgress({ done: 0, total: drafts.length });

    try {
      // Sequential — backend creates SolutionHypothesis + 2 child Hypothesis
      // rows per call. Parallel would race and complicate error attribution.
      for (let i = 0; i < drafts.length; i++) {
        const d = drafts[i];
        const res = await fetch("/api/solution-hypotheses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ problemCardId, statement: d.statement, source: d.source }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.details || body.error || `${i + 1}번째 가설 저장 실패`);
        }
        setSaveProgress({ done: i + 1, total: drafts.length });
      }
      await onSaved();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
      setSaveProgress(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-xl flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-h2 text-foreground">솔루션 가설 추가</h2>
            <p className="text-xs text-muted mt-0.5">
              직접 입력하거나 에이전트 후보를 1~3개 골라 편집하세요. 저장 시 각 가설마다 검증 처방이 자동 생성됩니다.
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
              <p className="text-xs text-muted">
                에이전트 후보 {candidates.length > 0 && <span className="text-tertiary">· {picked.length}개 선택</span>}
              </p>
              {!loadingCandidates && (
                <button
                  onClick={fetchCandidates}
                  disabled={userPromptOverLimit}
                  className="flex items-center gap-1 text-xs rounded-lg border border-border bg-canvas px-2.5 py-1 text-secondary hover:bg-wash disabled:opacity-50"
                >
                  <Sparkles size={12} /> {candidates.length === 0 ? "후보 3개 받기" : "후보 다시 받기"}
                </button>
              )}
              {loadingCandidates && (
                <span className="flex items-center gap-1 text-xs text-violet-600">
                  <Loader2 size={12} className="animate-spin" /> 생성 중...
                </span>
              )}
            </div>

            {/* Optional user-supplied requirements/considerations. Stays
                visible after candidates render so the user can amend and
                re-fetch without re-typing. */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="solution-user-prompt" className="text-xs text-muted">
                  추가 요건·고려사항 <span className="text-subtle">(선택)</span>
                </label>
                <span
                  className={`text-[11px] ${
                    userPromptOverLimit ? "text-red-600 font-medium" : "text-subtle"
                  }`}
                >
                  {userPrompt.length}/{USER_PROMPT_MAX}
                </span>
              </div>
              <textarea
                id="solution-user-prompt"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                rows={3}
                placeholder="예: 1인 운영을 전제로 합니다. 외부 인건비 최소화. 채널은 SNS 우선."
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
              />
              {userPromptOverLimit && (
                <p className="text-xs text-red-600 mt-1">
                  {USER_PROMPT_MAX}자 이내로 줄여주세요.
                </p>
              )}
            </div>

            {candidatesError && <p className="text-xs text-red-600">{candidatesError}</p>}
            {candidates.length > 0 && (
              <div className="space-y-2">
                {candidates.map((c, i) => {
                  const checked = isPicked(c) >= 0;
                  return (
                    <button
                      key={i}
                      onClick={() => toggleCandidate(c)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        checked
                          ? "border-violet-400 bg-violet-50"
                          : "border-border bg-canvas hover:border-violet-300 hover:bg-violet-50/40"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 inline-flex w-4 h-4 shrink-0 items-center justify-center rounded border ${
                            checked
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-border bg-canvas"
                          }`}
                          aria-hidden
                        >
                          {checked && <Check size={10} strokeWidth={3} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-violet-700 font-medium mb-1">후보 {i + 1} — {c.angle}</p>
                          <p className="text-sm text-body whitespace-pre-wrap">{c.statement}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    setCandidates([]);
                    setPicked([]);
                    setCandidatesError(null);
                  }}
                  className="text-xs text-subtle hover:text-secondary"
                >
                  후보 닫기
                </button>
              </div>
            )}
          </div>

          {/* Picked candidates → editable statements (one per pick) */}
          {isPicking ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted">
                  {isMerged
                    ? `결합 결과 편집 — 후보 ${mergeOrigin!.length}개를 합친 단일 가설입니다`
                    : "선택된 가설 편집 — 저장 시 각각 별개의 SolutionHypothesis로 등록됩니다"}
                </p>
                {!isMerged && picked.length >= 2 && !merging && (
                  <button
                    onClick={mergeSelected}
                    disabled={userPromptOverLimit}
                    className="flex items-center gap-1 text-xs rounded-lg border border-violet-300 bg-violet-50 px-2.5 py-1 text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                  >
                    <GitMerge size={12} /> 선택한 {picked.length}개를 결합
                  </button>
                )}
                {isMerged && !merging && (
                  <button
                    onClick={mergeSelected}
                    disabled={userPromptOverLimit}
                    className="flex items-center gap-1 text-xs rounded-lg border border-violet-300 bg-violet-50 px-2.5 py-1 text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                  >
                    <GitMerge size={12} /> 결합 다시 받기
                  </button>
                )}
                {merging && (
                  <span className="flex items-center gap-1 text-xs text-violet-600">
                    <Loader2 size={12} className="animate-spin" /> 결합 중...
                  </span>
                )}
              </div>
              {mergeError && <p className="text-xs text-red-600">{mergeError}</p>}
              {picked.map((p, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 ${
                    isMerged
                      ? "border-violet-400 bg-violet-50/60"
                      : "border-violet-200 bg-violet-50/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-violet-700 font-medium flex items-center gap-1">
                      {isMerged && <GitMerge size={11} />}
                      {p.angle}
                    </p>
                    <button
                      onClick={() => removePicked(i)}
                      className="text-xs text-tertiary hover:text-red-600"
                      title={isMerged ? "결합 취소" : "이 가설 빼기"}
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <textarea
                    value={p.statement}
                    onChange={(e) => updatePicked(i, e.target.value)}
                    disabled={merging}
                    rows={4}
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y disabled:opacity-60"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted mb-2">솔루션 가설 statement</p>
              <textarea
                value={manualStatement}
                onChange={(e) => {
                  setManualStatement(e.target.value);
                  if (saveError) setSaveError(null);
                }}
                rows={6}
                placeholder="누가 어떤 상황에서 무엇을 하는 솔루션인지 1~3문장으로. 답이 아니라 검증 대상 가설로 적습니다."
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
              />
            </div>
          )}

          {saveError && <p className="text-xs text-red-600">{saveError}</p>}
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2 bg-canvas">
          <span className="text-xs text-tertiary">
            {saveProgress
              ? `${saveProgress.done}/${saveProgress.total} 저장 중...`
              : isPicking
                ? isMerged
                  ? "결합 가설 1개 저장 예정"
                  : `${picked.length}개 가설 저장 예정`
                : ""}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="text-sm rounded-lg border border-border px-3 py-2 text-secondary hover:bg-wash disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={save}
              disabled={saving || !canSave()}
              className="flex items-center gap-1.5 text-sm rounded-lg bg-violet-600 px-3 py-2 text-white hover:bg-violet-500 disabled:opacity-40"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              저장 (검증 처방 생성)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
