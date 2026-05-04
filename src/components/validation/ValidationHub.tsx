"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
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
        problem={{
          title: view.title,
          who: view.who,
          when: view.when,
          why: view.why,
          painPoints: view.painPoints,
          alternatives: view.alternatives,
        }}
        progressDots={{ confirmed: problemConfirmed, total: 2 }}
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
            problemFullyConfirmed={problemConfirmed === 2}
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
  existence,
  severity,
  bootstrapping,
  onUpdated,
}: {
  existence: ApiHypothesis | null;
  severity: ApiHypothesis | null;
  bootstrapping: boolean;
  onUpdated: () => Promise<void>;
}) {
  const placeholder = bootstrapping ? "처방 생성 중..." : "처방 대기 중";
  return (
    <div className="space-y-4">
      <AxisWorkspace hypothesis={existence} onUpdated={onUpdated} loadingPlaceholder={placeholder} />
      <AxisWorkspace hypothesis={severity} onUpdated={onUpdated} loadingPlaceholder={placeholder} />
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
  problemFullyConfirmed,
  onChanged,
}: {
  problemCardId: string;
  activeSolutions: ApiSolution[];
  inactiveSolutions: ApiSolution[];
  problemFullyConfirmed: boolean;
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
            솔루션 가설을 등록하면 핏·지불 의사·1-pager·Reality Check로 검증을 시작할 수 있어요.
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
        <div className="space-y-5">
          <p className="text-xs font-medium text-tertiary uppercase tracking-wide">
            활성 솔루션 {activeSolutions.length}개
          </p>
          {activeSolutions.map((s) => (
            <SolutionValidationBlock
              key={s.id}
              solution={toBlockData(s)}
              problemConfirmed={problemFullyConfirmed}
              defaultExpanded
              onChanged={onChanged}
            />
          ))}
        </div>
      )}

      {inactiveSolutions.length > 0 && (
        <div className="space-y-5 pt-2">
          <p className="text-xs font-medium text-tertiary uppercase tracking-wide">
            보류·완료·깨진 솔루션 {inactiveSolutions.length}개
          </p>
          <div className="space-y-5 opacity-90">
            {inactiveSolutions.map((s) => (
              <SolutionValidationBlock
                key={s.id}
                solution={toBlockData(s)}
                problemConfirmed={problemFullyConfirmed}
                defaultExpanded={false}
                onChanged={onChanged}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
