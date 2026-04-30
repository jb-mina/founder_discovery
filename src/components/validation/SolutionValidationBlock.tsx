"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
  Scale,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AxisWorkspace, type AxisWorkspaceData } from "@/components/validation/AxisWorkspace";
import { OnePagerSection, type OnePagerData } from "@/components/validation/OnePagerSection";
import {
  HYPOTHESIS_STATUS_LABELS,
  HYPOTHESIS_STATUS_VARIANTS,
  parsePrescribedMethods,
  SOLUTION_STATUS_LABELS,
  SOLUTION_STATUS_VARIANTS,
  type HypothesisStatus,
  type SolutionStatus,
} from "@/lib/validation-labels";

export type SolutionBlockData = {
  id: string;
  statement: string;
  source: string;
  status: string;
  fit: AxisWorkspaceData | null;
  willingness: AxisWorkspaceData | null;
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

export function SolutionValidationBlock({
  solution,
  problemConfirmed,
  onChanged,
  expanded: controlledExpanded,
  onToggle: controlledToggle,
}: {
  solution: SolutionBlockData;
  problemConfirmed: boolean;
  onChanged: () => void | Promise<void>;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded ?? internalExpanded;
  const toggle =
    controlledToggle ?? (() => setInternalExpanded((prev) => !prev));

  const [shelving, setShelving] = useState(false);

  async function shelve(e: React.MouseEvent) {
    e.stopPropagation();
    setShelving(true);
    await fetch(`/api/solution-hypotheses/${solution.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "shelved" }),
    });
    await onChanged();
    setShelving(false);
  }

  const status = solution.status as SolutionStatus;
  const isAi = solution.source === "ai_suggested";
  const fitStatus = (solution.fit?.status ?? "not_started") as HypothesisStatus;
  const willingnessStatus = (solution.willingness?.status ?? "not_started") as HypothesisStatus;
  const fitMethodCount = solution.fit ? parsePrescribedMethods(solution.fit.prescribedMethods).length : 0;
  const willingnessMethodCount = solution.willingness
    ? parsePrescribedMethods(solution.willingness.prescribedMethods).length
    : 0;
  const hasRC = solution.realityCheck !== null;
  const hasOnePager = solution.onePager !== null;

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/30 overflow-hidden">
      {/* Compact header — always visible */}
      <div className="p-4 md:p-5 space-y-3">
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
            <p className="text-sm text-body whitespace-pre-wrap line-clamp-2">{solution.statement}</p>
          </div>
          {solution.status === "active" && (
            <button
              onClick={shelve}
              disabled={shelving}
              className="text-xs rounded-lg border border-border bg-canvas hover:bg-wash px-2.5 py-1 text-tertiary disabled:opacity-40 shrink-0"
            >
              {shelving ? <Loader2 size={12} className="animate-spin" /> : "보류"}
            </button>
          )}
        </div>

        {/* Compact axis summary rows */}
        <div className="space-y-1.5 pt-2 border-t border-violet-200/70">
          <SummaryRow
            label="핏"
            status={fitStatus}
            extra={fitMethodCount > 0 ? `메서드 ${fitMethodCount}개` : "처방 대기"}
          />
          <SummaryRow
            label="지불 의사"
            status={willingnessStatus}
            extra={willingnessMethodCount > 0 ? `메서드 ${willingnessMethodCount}개` : "처방 대기"}
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-tertiary">1-pager</span>
            <span className="text-subtle">
              {hasOnePager
                ? "초안 있음"
                : problemConfirmed && solution.status === "active"
                  ? "생성 가능"
                  : "문제 검증 후"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-tertiary">Reality Check</span>
            <span className="text-subtle">{hasRC ? "최근 결과 있음" : "미실행"}</span>
          </div>
        </div>

        {solution.status === "broken" && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <AlertTriangle size={12} className="text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700">검증으로 깨짐 — 새 솔루션 가설을 시도하세요</p>
          </div>
        )}

        <button
          onClick={toggle}
          className="w-full flex items-center justify-center gap-1 text-xs text-violet-600 hover:text-violet-500 font-medium pt-1"
        >
          {expanded ? (
            <>
              <ChevronUp size={12} /> 접기
            </>
          ) : (
            <>
              <ChevronDown size={12} /> 펼쳐서 검증 처방 보기
            </>
          )}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-violet-200/70 bg-surface p-4 md:p-5 space-y-4">
          <AxisWorkspace
            hypothesis={solution.fit}
            onUpdated={onChanged}
            loadingPlaceholder="처방 생성 중..."
          />
          <AxisWorkspace
            hypothesis={solution.willingness}
            onUpdated={onChanged}
            loadingPlaceholder="처방 생성 중..."
          />
          <OnePagerSection
            solutionHypothesisId={solution.id}
            triggerMet={problemConfirmed && solution.status === "active"}
            onePager={solution.onePager}
            onChanged={onChanged}
          />
          <RealityCheckSection solution={solution} onChanged={onChanged} />
        </div>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  status,
  extra,
}: {
  label: string;
  status: HypothesisStatus;
  extra: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-tertiary w-14 shrink-0">{label}</span>
        <Badge variant={HYPOTHESIS_STATUS_VARIANTS[status]}>{HYPOTHESIS_STATUS_LABELS[status]}</Badge>
      </div>
      <span className="text-subtle truncate">{extra}</span>
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
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Reality Check</h3>
          <p className="text-xs text-muted">이 솔루션 단위 챌린지 + 모더레이터 종합</p>
        </div>
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
            <p className="text-sm text-body whitespace-pre-wrap">{rc.moderatorSummary}</p>
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
                  <p className="text-xs text-secondary whitespace-pre-wrap">{content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
