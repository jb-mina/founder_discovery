"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { ONE_PAGER_SECTIONS, type OnePagerSection as SectionKey } from "@/lib/db/one-pager";

const SECTION_LABELS: Record<SectionKey, string> = {
  oneLineSummary: "한줄 요약",
  targetCustomer: "타깃 고객",
  problem: "문제",
  solution: "솔루션",
  mvpScope: "MVP 범위",
  mvpCostEstimate: "MVP 구현 비용 추정",
  operatingModel: "운영 모델",
  monetization: "수익화 가설",
  topRisks: "주요 리스크 3개",
  validationActions30d: "30일 이내 검증 액션",
};

const SECTION_PLACEHOLDER: Record<SectionKey, string> = {
  oneLineSummary: "[누가] [어떤 상황에서] [무엇을 통해] [어떤 결과를] 얻는다",
  targetCustomer: "1차 타깃 고객 정의 (인구통계 + 행동 + 상황)",
  problem: "이 솔루션이 해결하려는 문제 (사업 관점)",
  solution: "솔루션 핵심 메커니즘 — 어떻게 문제를 해결하는가",
  mvpScope: "MVP에 포함할 최소 기능 묶음. v1 / v2 이후 구분",
  mvpCostEstimate: "인건비 시간(주/명·month) + 외부 비용 (가정 명시)",
  operatingModel: "1인 운영 vs 분담. CS·콘텐츠·세일즈는 어떻게",
  monetization: "가격·과금 단위·결제 시점·LTV 가정",
  topRisks: "가장 치명적인 리스크 3개 (줄 분리)",
  validationActions30d: "30일 안에 실행 가능한 검증 액션 3~5개 (줄 분리)",
};

export type OnePagerData = {
  id: string;
  oneLineSummary: string;
  targetCustomer: string;
  problem: string;
  solution: string;
  mvpScope: string;
  mvpCostEstimate: string;
  operatingModel: string;
  monetization: string;
  topRisks: string;
  validationActions30d: string;
  draftGeneratedAt: string | null;
  lastEditedAt: string | null;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function OnePagerSection({
  solutionHypothesisId,
  triggerMet,
  onePager,
  onChanged,
}: {
  solutionHypothesisId: string;
  triggerMet: boolean;
  onePager: OnePagerData | null;
  onChanged: () => void | Promise<void>;
}) {
  // Existing onePager content is viewable regardless of trigger state — only
  // generation/regeneration is gated by triggerMet so users can revisit
  // shelved/confirmed/broken solutions and their drafts.
  if (onePager)
    return (
      <Editor
        // Force a fresh mount when a new AI draft replaces the prior content,
        // so local edit state can't shadow the regenerated server draft.
        key={onePager.draftGeneratedAt ?? "initial"}
        solutionHypothesisId={solutionHypothesisId}
        onePager={onePager}
        onChanged={onChanged}
        canRegenerate={triggerMet}
      />
    );
  if (!triggerMet) return <Placeholder />;
  return (
    <CTABlock
      solutionHypothesisId={solutionHypothesisId}
      onChanged={onChanged}
    />
  );
}

function Placeholder() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-wash px-4 py-3">
      <p className="text-xs text-muted">
        솔루션을 활성화하면 1-pager 초안을 생성할 수 있어요.
      </p>
    </div>
  );
}

function CTABlock({
  solutionHypothesisId,
  onChanged,
}: {
  solutionHypothesisId: string;
  onChanged: () => void | Promise<void>;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/one-pagers/${solutionHypothesisId}/draft`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `초안 생성 실패 (${res.status})`);
      }
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
      <p className="text-xs text-secondary mb-2.5">
        AI가 10 섹션 초안을 채우면 자유롭게 편집해 사업화 사고(MVP·비용·운영·수익화·리스크)를 정리할 수 있어요.
      </p>
      <button
        onClick={generate}
        disabled={generating}
        className="flex items-center gap-1.5 text-xs rounded-lg bg-violet-600 px-3 py-2 text-white hover:bg-violet-500 disabled:opacity-60"
      >
        {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {generating ? "초안 생성 중..." : "1-pager 초안 생성"}
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

type SectionMap = Record<SectionKey, string>;

function snapshotFromOnePager(onePager: OnePagerData): SectionMap {
  return Object.fromEntries(
    ONE_PAGER_SECTIONS.map((k) => [k, onePager[k]]),
  ) as SectionMap;
}

function Editor({
  solutionHypothesisId,
  onePager,
  onChanged,
  canRegenerate,
}: {
  solutionHypothesisId: string;
  onePager: OnePagerData;
  onChanged: () => void | Promise<void>;
  canRegenerate: boolean;
}) {
  const initial = useMemo(() => snapshotFromOnePager(onePager), [onePager]);
  // Local edits (what the user sees in textareas).
  const [values, setValues] = useState<SectionMap>(initial);
  // Last server-known values per section. Updated after a successful PATCH;
  // the diff against `values` is what defines "dirty".
  const [serverValues, setServerValues] = useState<SectionMap>(initial);
  // Per-section in-flight save tracking — used both for UI status and to
  // prevent re-entrant blur saves on the same section.
  const [savingKeys, setSavingKeys] = useState<Set<SectionKey>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const dirtyKeys = ONE_PAGER_SECTIONS.filter(
    (k) => values[k] !== serverValues[k],
  );
  const isSaving = savingKeys.size > 0;
  const allClean = dirtyKeys.length === 0 && !isSaving;

  async function saveKeys(keys: SectionKey[]): Promise<boolean> {
    // Skip keys already being saved (prevents racing PATCHes from blur+button).
    // Snapshot is captured from the closure at call time — that's exactly the
    // value the user saw when they triggered the save (click or blur).
    const targets = keys.filter((k) => !savingKeys.has(k));
    if (targets.length === 0) return true;
    const snapshot = Object.fromEntries(
      targets.map((k) => [k, values[k]]),
    ) as Partial<SectionMap>;

    setSavingKeys((prev) => {
      const next = new Set(prev);
      for (const k of targets) next.add(k);
      return next;
    });
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/one-pagers/${solutionHypothesisId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `저장 실패 (${res.status})`);
      }
      setServerValues((prev) => ({ ...prev, ...snapshot }));
      await onChanged();
      return true;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        for (const k of targets) next.delete(k);
        return next;
      });
    }
  }

  function saveAll() {
    void saveKeys(dirtyKeys);
  }

  function handleBlur(key: SectionKey) {
    if (values[key] === serverValues[key]) return;
    void saveKeys([key]);
  }

  async function regenerate() {
    if (
      !window.confirm(
        "기존 1-pager가 새 AI 초안으로 모두 덮어씌워집니다. 계속할까요?",
      )
    ) {
      return;
    }
    setRegenerating(true);
    setRegenError(null);
    try {
      const res = await fetch(
        `/api/one-pagers/${solutionHypothesisId}/draft`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `재생성 실패 (${res.status})`);
      }
      await onChanged();
    } catch (e) {
      setRegenError(e instanceof Error ? e.message : String(e));
    } finally {
      setRegenerating(false);
    }
  }

  const editedAt = onePager.lastEditedAt;
  const draftAt = onePager.draftGeneratedAt;
  const meta = editedAt
    ? `마지막 수정: ${timeAgo(editedAt)}`
    : draftAt
      ? `초안 생성: ${timeAgo(draftAt)}`
      : "";

  return (
    <div className="rounded-lg border border-violet-200 bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-violet-200/70 bg-violet-50/40 flex-wrap">
        <p className="text-xs text-muted">{meta}</p>
        <div className="flex items-center gap-3">
          {/* Save status / batch save action */}
          {isSaving ? (
            <span className="flex items-center gap-1 text-xs text-tertiary">
              <Loader2 size={12} className="animate-spin" />
              저장 중...
            </span>
          ) : dirtyKeys.length > 0 ? (
            <button
              onClick={saveAll}
              className="flex items-center gap-1 text-xs rounded-md bg-violet-600 px-2.5 py-1 text-white hover:bg-violet-500 font-medium"
              title="모든 섹션의 변경사항을 한 번에 저장"
            >
              변경사항 저장 ({dirtyKeys.length})
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs text-tertiary">
              <Check size={12} className="text-green-600" />
              저장됨
            </span>
          )}
          {canRegenerate && (
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="flex items-center gap-1 text-xs text-tertiary hover:text-secondary disabled:opacity-50"
              title="기존 내용을 모두 AI 초안으로 덮어씀"
            >
              {regenerating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              {regenerating ? "재생성 중..." : "초안 재생성"}
            </button>
          )}
        </div>
      </div>
      {(saveError || regenError) && (
        <p className="text-xs text-red-600 px-4 pt-2">
          {saveError || regenError}
        </p>
      )}
      {dirtyKeys.length > 0 && !allClean && (
        <p className="text-xs text-amber-700 bg-amber-50 border-b border-amber-200 px-4 py-1.5">
          저장되지 않은 변경사항이 있습니다. 패널 검토(RC)는 저장된 1-pager를 기준으로 실행됩니다.
        </p>
      )}

      <div className="p-3 space-y-3">
        {ONE_PAGER_SECTIONS.map((key) => {
          const dirty = values[key] !== serverValues[key];
          const saving = savingKeys.has(key);
          return (
            <SectionEditor
              key={key}
              sectionKey={key}
              value={values[key]}
              dirty={dirty}
              saving={saving}
              onChange={(v) =>
                setValues((prev) => ({ ...prev, [key]: v }))
              }
              onBlur={() => handleBlur(key)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SectionEditor({
  sectionKey,
  value,
  dirty,
  saving,
  onChange,
  onBlur,
}: {
  sectionKey: SectionKey;
  value: string;
  dirty: boolean;
  saving: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  const status: { label: string; className: string; icon: "spin" | "check" | "dot" | null } =
    saving
      ? { label: "저장 중", className: "text-tertiary", icon: "spin" }
      : dirty
        ? { label: "미저장", className: "text-amber-600", icon: "dot" }
        : { label: "저장됨", className: "text-tertiary", icon: "check" };

  return (
    <div className="rounded-lg border border-border bg-canvas px-3 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-medium text-foreground">
          {SECTION_LABELS[sectionKey]}
        </p>
        <span className={`flex items-center gap-1 text-xs ${status.className}`}>
          {status.icon === "spin" && <Loader2 size={10} className="animate-spin" />}
          {status.icon === "check" && <Check size={10} className="text-green-600" />}
          {status.icon === "dot" && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
          )}
          {status.label}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={Math.max(3, Math.min(8, value.split("\n").length + 1))}
        placeholder={SECTION_PLACEHOLDER[sectionKey]}
        className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
      />
    </div>
  );
}
