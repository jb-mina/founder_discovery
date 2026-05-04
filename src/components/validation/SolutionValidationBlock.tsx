"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
  Scale,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/ui/markdown";
import { AxisWorkspace, type AxisWorkspaceData } from "@/components/validation/AxisWorkspace";
import { OnePagerSection, type OnePagerData } from "@/components/validation/OnePagerSection";
import {
  SOLUTION_STATUS_LABELS,
  SOLUTION_STATUS_VARIANTS,
  type HypothesisStatus,
  type SolutionStatus,
} from "@/lib/validation-labels";

// Hypothesis row enriched with updatedAt so we can pick the most-recently-
// edited tool as the default tab. Optional because the field flows through
// the API as a string but isn't part of AxisWorkspaceData proper.
type AxisData = AxisWorkspaceData & { updatedAt?: string };

export type SolutionBlockData = {
  id: string;
  statement: string;
  source: string;
  status: string;
  fit: AxisData | null;
  willingness: AxisData | null;
  realityCheck: {
    id: string;
    coldInvestor: string;
    honestFriend: string;
    socraticQ: string;
    moderatorSummary: string;
    createdAt: string;
  } | null;
  onePager: OnePagerData | null;
};

type TabKey = "fit" | "willingness" | "onepager" | "reality";

const TAB_LABELS: Record<TabKey, string> = {
  fit: "핏",
  willingness: "지불",
  onepager: "1-pager",
  reality: "RC",
};

const HYP_STATUS_KO: Record<HypothesisStatus, string> = {
  not_started: "시작 전",
  in_progress: "진행 중",
  broken: "깨짐",
  confirmed: "확인됨",
};

// Tab dot color reflects the underlying tool's status. The dot is the
// status indicator — there is no separate status row above the tabs.
function tabDotClass(tab: TabKey, solution: SolutionBlockData): string {
  if (tab === "fit" || tab === "willingness") {
    const s = (tab === "fit" ? solution.fit?.status : solution.willingness?.status) ?? "not_started";
    if (s === "confirmed") return "bg-green-500";
    if (s === "broken") return "bg-red-500";
    if (s === "in_progress") return "bg-amber-500";
    return "bg-canvas border border-border-strong";
  }
  if (tab === "onepager") {
    return solution.onePager ? "bg-violet-500" : "bg-canvas border border-border-strong";
  }
  return solution.realityCheck ? "bg-blue-500" : "bg-canvas border border-border-strong";
}

function tabAriaLabel(tab: TabKey, solution: SolutionBlockData): string {
  const label = TAB_LABELS[tab];
  if (tab === "fit" || tab === "willingness") {
    const s = ((tab === "fit" ? solution.fit?.status : solution.willingness?.status) ??
      "not_started") as HypothesisStatus;
    return `${label}: ${HYP_STATUS_KO[s]}`;
  }
  if (tab === "onepager") return `1-pager: ${solution.onePager ? "초안 있음" : "미생성"}`;
  return `Reality Check: ${solution.realityCheck ? "결과 있음" : "미실행"}`;
}

// Default tab heuristic: pick whichever tool was most recently touched
// (status PATCH, findings save, 1-pager edit/draft, RC run). Falls back to
// "fit" when nothing has activity yet. Evaluated once on mount via lazy
// init; later state updates don't reset the chosen tab.
function defaultTab(solution: SolutionBlockData): TabKey {
  const entries: { key: TabKey; ts: number }[] = [];
  if (solution.fit?.updatedAt) entries.push({ key: "fit", ts: Date.parse(solution.fit.updatedAt) });
  if (solution.willingness?.updatedAt)
    entries.push({ key: "willingness", ts: Date.parse(solution.willingness.updatedAt) });
  if (solution.onePager) {
    const ts = solution.onePager.lastEditedAt ?? solution.onePager.draftGeneratedAt;
    if (ts) entries.push({ key: "onepager", ts: Date.parse(ts) });
  }
  if (solution.realityCheck)
    entries.push({ key: "reality", ts: Date.parse(solution.realityCheck.createdAt) });
  entries.sort((a, b) => b.ts - a.ts);
  return entries[0]?.key ?? "fit";
}

export function SolutionValidationBlock({
  solution,
  problemConfirmed,
  defaultExpanded = true,
  onChanged,
}: {
  solution: SolutionBlockData;
  problemConfirmed: boolean;
  defaultExpanded?: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const [tab, setTab] = useState<TabKey>(() => defaultTab(solution));
  const [pendingStatus, setPendingStatus] = useState<SolutionStatus | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);

  async function setStatus(next: SolutionStatus) {
    setPendingStatus(next);
    await fetch(`/api/solution-hypotheses/${solution.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await onChanged();
    setPendingStatus(null);
  }

  const status = solution.status as SolutionStatus;
  const isAi = solution.source === "ai_suggested";
  const tabKeys = Object.keys(TAB_LABELS) as TabKey[];

  // Header action varies by current status. broken/confirmed are normally
  // auto-derived from child Hypothesis status (see recomputeSolutionStatus),
  // but a manual "활성화로 원복" escape hatch is exposed for human-error
  // recovery — re-running cascade only happens when a child status changes,
  // so this revert sticks until the user actually edits a child.
  const action: { label: string; target: SolutionStatus; title: string } | null =
    status === "active"
      ? { label: "보류", target: "shelved", title: "이 솔루션을 보류" }
      : status === "shelved"
        ? { label: "활성화", target: "active", title: "이 솔루션을 다시 활성화" }
        : { label: "활성화로 원복", target: "active", title: "상태를 활성으로 되돌립니다 (자식 가설 상태 유지)" };

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/30 overflow-hidden">
      {/* Header — uses a hidden full-width toggle button as the click
          target so nested interactive controls (action button) remain
          legal HTML. The toggle is layered under the visual content. */}
      <div className="relative p-4 md:p-5 hover:bg-violet-100/30 transition-colors">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "솔루션 접기" : "솔루션 펼치기"}
          className="absolute inset-0 w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-2xl"
        />
        <div className="relative pointer-events-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge variant={SOLUTION_STATUS_VARIANTS[status]}>{SOLUTION_STATUS_LABELS[status]}</Badge>
                {isAi && (
                  <span className="inline-flex items-center gap-1 text-xs text-tertiary">
                    <Sparkles size={10} /> 에이전트 후보
                  </span>
                )}
              </div>
              <p className="text-sm text-body whitespace-pre-wrap">{solution.statement}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 pointer-events-auto">
              <button
                type="button"
                onClick={() => setStatus(action.target)}
                disabled={pendingStatus !== null}
                className="text-xs rounded-lg border border-border bg-canvas hover:bg-wash px-2.5 py-1 text-tertiary disabled:opacity-40"
                title={action.title}
              >
                {pendingStatus !== null ? <Loader2 size={12} className="animate-spin" /> : action.label}
              </button>
              <span aria-hidden className="text-tertiary">
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </div>
          </div>

          {status === "broken" && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 mt-3">
              <AlertTriangle size={12} className="text-red-600 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">
                검증으로 깨짐 — 새 솔루션 가설을 시도하거나 자식 가설을 수정해 다시 검증하세요
              </p>
            </div>
          )}

          {status === "confirmed" && (
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 mt-3">
              <CheckCircle2 size={12} className="text-green-600 mt-0.5 shrink-0" />
              <p className="text-xs text-green-700">
                핏·지불 의사 모두 확인됨 — 필요 시 자식 가설을 수정하면 상태가 자동 재계산됩니다
              </p>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <>
      {/* 4-tab segmented control. Tab dot = tool status. grid-cols-4 keeps
          equal width on every viewport (375px+) without overflow risk. */}
      <div className="border-t border-violet-200/70 bg-violet-50/40">
        <div
          role="tablist"
          aria-label="솔루션 도구"
          className="grid grid-cols-4"
        >
          {tabKeys.map((k) => {
            const active = tab === k;
            return (
              <button
                key={k}
                role="tab"
                aria-selected={active}
                aria-label={tabAriaLabel(k, solution)}
                onClick={() => setTab(k)}
                className={`flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-medium border-b-2 transition-colors min-h-[44px] ${
                  active
                    ? "border-violet-600 text-violet-700 bg-surface"
                    : "border-transparent text-tertiary hover:text-secondary"
                }`}
              >
                <span
                  aria-hidden
                  className={`inline-block w-2 h-2 rounded-full shrink-0 ${tabDotClass(k, solution)}`}
                />
                <span className="truncate">{TAB_LABELS[k]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active tab content */}
      <div className="bg-surface p-4 md:p-5">
        {tab === "fit" && (
          <AxisWorkspace
            hypothesis={solution.fit}
            onUpdated={onChanged}
            loadingPlaceholder="처방 생성 중..."
            hideAxisHeader
          />
        )}
        {tab === "willingness" && (
          <AxisWorkspace
            hypothesis={solution.willingness}
            onUpdated={onChanged}
            loadingPlaceholder="처방 생성 중..."
            hideAxisHeader
          />
        )}
        {tab === "onepager" && (
          <OnePagerSection
            solutionHypothesisId={solution.id}
            triggerMet={problemConfirmed && solution.status === "active"}
            onePager={solution.onePager}
            onChanged={onChanged}
          />
        )}
        {tab === "reality" && (
          <RealityCheckSection solution={solution} onChanged={onChanged} />
        )}
      </div>
        </>
      )}
    </div>
  );
}

function RealityCheckSection({
  solution,
  onChanged,
}: {
  solution: SolutionBlockData;
  onChanged: () => void | Promise<void>;
}) {
  const [running, setRunning] = useState(false);
  const [showPersonas, setShowPersonas] = useState(false);

  async function runRealityCheck() {
    setRunning(true);
    await fetch("/api/reality-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solutionHypothesisId: solution.id }),
    });
    await onChanged();
    setRunning(false);
  }

  const rc = solution.realityCheck;

  return (
    <div>
      {/* Action row — short description + run button. Wraps on narrow widths. */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <p className="text-xs text-muted flex-1 min-w-[12rem]">
          냉정한 투자자·솔직한 친구·소크라테스 3 페르소나가 솔루션을 비판적으로 검토하고
          모더레이터가 종합합니다.
        </p>
        <button
          onClick={runRealityCheck}
          disabled={running}
          className="flex items-center gap-1.5 text-xs rounded-lg border border-border bg-canvas hover:bg-wash px-2.5 py-1.5 text-tertiary disabled:opacity-40 shrink-0"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          {rc ? "재실행" : "실행"}
        </button>
      </div>

      {!rc ? (
        <p className="text-xs text-subtle">아직 실행된 Reality Check이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {/* Moderator first — always visible */}
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
            <div className="flex items-center gap-1 mb-1 text-violet-600">
              <Scale size={12} />
              <p className="text-xs font-medium">중재자 종합</p>
            </div>
            <Markdown content={rc.moderatorSummary} className="text-body" />
          </div>

          {/* Personas — toggleable */}
          <button
            onClick={() => setShowPersonas((v) => !v)}
            className="flex items-center gap-1 text-xs text-tertiary hover:text-secondary"
          >
            {showPersonas ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            페르소나 3개 의견 {showPersonas ? "접기" : "펼치기"}
          </button>

          {showPersonas && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { icon: Zap, label: "냉정한 투자자", content: rc.coldInvestor, color: "text-red-600" },
                { icon: AlertTriangle, label: "솔직한 친구", content: rc.honestFriend, color: "text-amber-600" },
                { icon: HelpCircle, label: "소크라테스", content: rc.socraticQ, color: "text-blue-600" },
              ].map(({ icon: Icon, label, content, color }) => (
                <div key={label} className="bg-canvas border border-border rounded-lg p-3">
                  <div className={`flex items-center gap-1 mb-2 ${color}`}>
                    <Icon size={12} />
                    <p className="text-xs font-medium">{label}</p>
                  </div>
                  <Markdown content={content} className="text-secondary" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
