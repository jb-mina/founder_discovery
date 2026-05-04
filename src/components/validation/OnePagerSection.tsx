"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
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
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

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
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-violet-200/70 bg-violet-50/40">
        <p className="text-xs text-muted">{meta}</p>
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
      {regenError && (
        <p className="text-xs text-red-600 px-4 pt-2">{regenError}</p>
      )}

      <div className="p-3 space-y-3">
        {ONE_PAGER_SECTIONS.map((key) => (
          <SectionEditor
            key={key}
            solutionHypothesisId={solutionHypothesisId}
            sectionKey={key}
            initial={onePager[key]}
            onSaved={onChanged}
          />
        ))}
      </div>
    </div>
  );
}

function SectionEditor({
  solutionHypothesisId,
  sectionKey,
  initial,
  onSaved,
}: {
  solutionHypothesisId: string;
  sectionKey: SectionKey;
  initial: string;
  onSaved: () => void | Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [serverValue, setServerValue] = useState(initial);

  const dirty = value !== serverValue;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/one-pagers/${solutionHypothesisId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [sectionKey]: value }),
        },
      );
      if (res.ok) {
        setServerValue(value);
        await onSaved();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-canvas px-3 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-medium text-foreground">
          {SECTION_LABELS[sectionKey]}
        </p>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-500 font-medium disabled:opacity-50"
          >
            {saving && <Loader2 size={10} className="animate-spin" />}
            저장
          </button>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={Math.max(3, Math.min(8, value.split("\n").length + 1))}
        placeholder={SECTION_PLACEHOLDER[sectionKey]}
        className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
      />
    </div>
  );
}
