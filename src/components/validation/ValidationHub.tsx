"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProblemHeader } from "@/components/validation/ProblemHeader";
import { MainTabs, type TabKey } from "@/components/validation/MainTabs";
import { AxisWorkspace, type AxisWorkspaceData } from "@/components/validation/AxisWorkspace";
import { SolutionPanel } from "@/components/validation/SolutionPanel";
import { SolutionValidationBlock } from "@/components/validation/SolutionValidationBlock";
import type { OnePagerData } from "@/components/validation/OnePagerSection";

type ApiHypothesis = AxisWorkspaceData & {
  problemCardId: string | null;
  solutionHypothesisId: string | null;
  // Used by SolutionValidationBlock to pick the most-recently-edited tool
  // as the default tab on mount.
  updatedAt: string;
};

type ApiRealityCheck = {
  id: string;
  coldInvestor: string;
  honestFriend: string;
  socraticQ: string;
  moderatorSummary: string;
  createdAt: string;
};

type ApiSolution = {
  id: string;
  statement: string;
  source: string;
  status: string;
  hypotheses: ApiHypothesis[];
  realityChecks: ApiRealityCheck[];
  onePager: OnePagerData | null;
};

type ApiView = {
  id: string;
  title: string;
  who: string;
  when: string;
  why: string;
  painPoints: string;
  alternatives: string;
  hypotheses: ApiHypothesis[];
  solutionHypotheses: ApiSolution[];
};

export function ValidationHub({ problemCardId }: { problemCardId: string }) {
  const [view, setView] = useState<ApiView | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("problem");

  const fetchView = useCallback(async () => {
    const res = await fetch(`/api/validation/${problemCardId}`);
    if (!res.ok) {
      setError(`문제를 불러올 수 없습니다 (${res.status})`);
      setLoading(false);
      return null;
    }
    const data = (await res.json()) as ApiView;
    setView(data);
    return data;
  }, [problemCardId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const initial = await fetchView();
      if (initial && initial.hypotheses.length === 0) {
        setBootstrapping(true);
        try {
          await fetch(`/api/problems/${problemCardId}/hypotheses`, { method: "POST" });
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
        setBootstrapping(false);
        await fetchView();
      }
      setLoading(false);
    })();
  }, [problemCardId, fetchView]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-tertiary">
        <Loader2 size={16} className="animate-spin" /> 검증 허브 로딩 중...
      </div>
    );
  }

  if (error || !view) {
    return <div className="p-6 text-sm text-red-600">{error ?? "문제를 찾을 수 없습니다"}</div>;
  }

  const existence = view.hypotheses.find((h) => h.axis === "existence") ?? null;
  const severity = view.hypotheses.find((h) => h.axis === "severity") ?? null;
  const problemConfirmed =
    Number(existence?.status === "confirmed") + Number(severity?.status === "confirmed");

  const activeSolutions = view.solutionHypotheses.filter((s) => s.status === "active");
  const inactiveSolutions = view.solutionHypotheses.filter((s) => s.status !== "active");
  const recommended: TabKey | null =
    problemConfirmed < 2 ? "problem" : activeSolutions.length === 0 ? "solution" : null;

  return (
    <div className="pb-20">
      <ProblemHeader
        problemCardId={problemCardId}
        problem={{
          title: view.title,
          who: view.who,
          when: view.when,
          why: view.why,
          painPoints: view.painPoints,
          alternatives: view.alternatives,
        }}
        progressDots={{ confirmed: problemConfirmed, total: 2 }}
        onUpdated={async () => {
          await fetchView();
        }}
      />

      <div className="px-4 md:px-6 pt-3">
        <MainTabs
          active={tab}
          onChange={setTab}
          problemConfirmed={problemConfirmed}
          problemTotal={2}
          activeSolutionCount={activeSolutions.length}
          recommended={recommended}
        />
      </div>

      <div className="p-4 md:p-6 space-y-5">
        {tab === "problem" ? (
          <ProblemTab
            problemCardId={problemCardId}
            existence={existence}
            severity={severity}
            bootstrapping={bootstrapping}
            onUpdated={async () => {
              await fetchView();
            }}
          />
        ) : (
          <SolutionTab
            problemCardId={problemCardId}
            activeSolutions={activeSolutions}
            inactiveSolutions={inactiveSolutions}
            onChanged={async () => {
              await fetchView();
            }}
          />
        )}
      </div>
    </div>
  );
}

function ProblemTab({
  problemCardId,
  existence,
  severity,
  bootstrapping,
  onUpdated,
}: {
  problemCardId: string;
  existence: ApiHypothesis | null;
  severity: ApiHypothesis | null;
  bootstrapping: boolean;
  onUpdated: () => Promise<void>;
}) {
  const placeholder = bootstrapping ? "처방 생성 중..." : "처방 대기 중";
  const lastUpdated = mostRecent(existence?.updatedAt, severity?.updatedAt);
  return (
    <div className="space-y-4">
      {(existence || severity) && (
        <HypothesesRefreshBar
          problemCardId={problemCardId}
          lastUpdated={lastUpdated}
          onRefreshed={onUpdated}
        />
      )}
      <AxisWorkspace hypothesis={existence} onUpdated={onUpdated} loadingPlaceholder={placeholder} />
      <AxisWorkspace hypothesis={severity} onUpdated={onUpdated} loadingPlaceholder={placeholder} />
    </div>
  );
}

function mostRecent(a?: string, b?: string): string | null {
  if (!a && !b) return null;
  if (!a) return b ?? null;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

// Refresh bar — calls the existing bootstrap endpoint, which uses
// `bootstrapProblemHypotheses` (upsert) and overwrites only the AI-generated
// fields (prescribedMethods/successSignals/failureSignals). User-owned
// fields (findings, status) are preserved.
function HypothesesRefreshBar({
  problemCardId,
  lastUpdated,
  onRefreshed,
}: {
  problemCardId: string;
  lastUpdated: string | null;
  onRefreshed: () => Promise<void>;
}) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    if (
      !window.confirm(
        "기존 추천 메서드와 성공/실패 시그널이 새 AI 처방으로 덮어씌워집니다.\nfindings(검증 기록)와 status는 보존됩니다. 계속할까요?",
      )
    ) {
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/problems/${problemCardId}/hypotheses`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `재생성 실패 (${res.status})`);
      }
      await onRefreshed();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50/40 px-3 py-2 flex-wrap">
      <div className="text-xs text-tertiary min-w-0">
        <span className="text-secondary font-medium">문제 검증 처방</span>
        {lastUpdated && (
          <span className="ml-2 text-subtle">갱신: {timeAgo(lastUpdated)}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-red-600">{error}</span>}
        <button
          onClick={refresh}
          disabled={running}
          className="flex items-center gap-1 text-xs rounded-md border border-border bg-canvas hover:bg-wash px-2.5 py-1.5 text-tertiary disabled:opacity-50"
          title="문제 카드 수정 후 새 처방을 받습니다 (findings/status 보존)"
        >
          {running ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          {running ? "처방 생성 중..." : "처방 새로 받기"}
        </button>
      </div>
    </div>
  );
}

function toBlockData(s: ApiSolution) {
  return {
    id: s.id,
    statement: s.statement,
    source: s.source,
    status: s.status,
    fit: s.hypotheses.find((h) => h.axis === "fit") ?? null,
    willingness: s.hypotheses.find((h) => h.axis === "willingness") ?? null,
    realityCheck: s.realityChecks[0] ?? null,
    onePager: s.onePager,
  };
}

function SolutionTab({
  problemCardId,
  activeSolutions,
  inactiveSolutions,
  onChanged,
}: {
  problemCardId: string;
  activeSolutions: ApiSolution[];
  inactiveSolutions: ApiSolution[];
  onChanged: () => Promise<void>;
}) {
  const totalSolutions = activeSolutions.length + inactiveSolutions.length;
  const hasOnlyInactive = activeSolutions.length === 0 && inactiveSolutions.length > 0;

  return (
    <div className="space-y-5">
      <SolutionPanel problemCardId={problemCardId} onChanged={onChanged} />

      {totalSolutions === 0 && (
        <Card className="text-center py-8">
          <Sparkles size={20} className="mx-auto mb-2 text-violet-400" />
          <p className="text-sm text-tertiary">
            솔루션 가설을 등록하면 핏·지불 의사·1-pager·패널 검토로 검증을 시작할 수 있어요.
          </p>
        </Card>
      )}

      {hasOnlyInactive && (
        <Card className="text-center py-6">
          <p className="text-sm text-tertiary">
            활성 솔루션 없음 — 보류·완료 가설을 활성화하거나 새 가설을 추가하세요.
          </p>
        </Card>
      )}

      {activeSolutions.length > 0 && (
        <section className="space-y-4">
          <header className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-foreground">활성 솔루션</h3>
            <span className="text-xs text-tertiary">· {activeSolutions.length}개</span>
          </header>
          <div className="space-y-4">
            {activeSolutions.map((s) => (
              <SolutionValidationBlock
                key={s.id}
                solution={toBlockData(s)}
                defaultExpanded
                onChanged={onChanged}
              />
            ))}
          </div>
        </section>
      )}

      {inactiveSolutions.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-border">
          <header className="flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-tertiary">보류·완료·깨진 솔루션</h3>
            <span className="text-xs text-tertiary">· {inactiveSolutions.length}개</span>
          </header>
          <div className="rounded-2xl bg-wash p-3 md:p-4 space-y-3">
            {inactiveSolutions.map((s) => (
              <SolutionValidationBlock
                key={s.id}
                solution={toBlockData(s)}
                defaultExpanded={false}
                onChanged={onChanged}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
