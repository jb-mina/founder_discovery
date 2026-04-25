"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ArrowUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProblemHeader } from "@/components/validation/ProblemHeader";
import { MainTabs, type TabKey } from "@/components/validation/MainTabs";
import { AxisWorkspace, type AxisWorkspaceData } from "@/components/validation/AxisWorkspace";
import { SolutionPanel, type SolutionPanelData } from "@/components/validation/SolutionPanel";
import { SolutionValidationBlock } from "@/components/validation/SolutionValidationBlock";

type ApiHypothesis = AxisWorkspaceData & {
  problemCardId: string | null;
  solutionHypothesisId: string | null;
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

  // -------- derived state --------
  const existence = view.hypotheses.find((h) => h.axis === "existence") ?? null;
  const severity = view.hypotheses.find((h) => h.axis === "severity") ?? null;
  const problemConfirmed =
    Number(existence?.status === "confirmed") + Number(severity?.status === "confirmed");

  const activeSolutions = view.solutionHypotheses.filter((s) => s.status === "active");
  const recommended: TabKey | null =
    problemConfirmed < 2 ? "problem" : activeSolutions.length === 0 ? "solution" : null;

  const solutionPanelData: SolutionPanelData[] = view.solutionHypotheses.map((s) => ({
    id: s.id,
    statement: s.statement,
    source: s.source,
    status: s.status,
    hypothesesConfirmed: s.hypotheses.filter((h) => h.status === "confirmed").length,
    hypothesesTotal: s.hypotheses.length,
  }));

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
            solutionPanel={solutionPanelData}
            activeSolutions={activeSolutions}
            onChanged={async () => {
              await fetchView();
            }}
            onJumpToProblem={() => setTab("problem")}
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
  const placeholder = bootstrapping ? "에이전트가 처방 생성 중 (~10초)..." : "처방 대기 중";
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        문제 단위 가설 — 솔루션과 무관하게 문제 자체가 존재하고 아픈가를 검증합니다.
      </p>
      <AxisWorkspace hypothesis={existence} onUpdated={onUpdated} loadingPlaceholder={placeholder} />
      <AxisWorkspace hypothesis={severity} onUpdated={onUpdated} loadingPlaceholder={placeholder} />
    </div>
  );
}

function SolutionTab({
  problemCardId,
  solutionPanel,
  activeSolutions,
  onChanged,
  onJumpToProblem,
}: {
  problemCardId: string;
  solutionPanel: SolutionPanelData[];
  activeSolutions: ApiSolution[];
  onChanged: () => Promise<void>;
  onJumpToProblem: () => void;
}) {
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2">
          <h2 className="text-sm font-semibold text-foreground">솔루션 가설</h2>
          <p className="text-xs text-muted">솔루션 단위 · 여러 가설을 병렬로 활성화해 비교 가능</p>
        </div>
        <SolutionPanel
          problemCardId={problemCardId}
          solutions={solutionPanel}
          onChanged={onChanged}
        />
      </section>

      {activeSolutions.length > 0 ? (
        <section className="space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">활성 솔루션 검증 ({activeSolutions.length})</h2>
            <p className="text-xs text-muted">
              각 활성 솔루션의 핏·지불 의사 가설과 Reality Check. 둘 다 confirmed면 그 솔루션이 자동 confirmed, 하나라도 broken되면 자동 깨짐 처리됩니다.
            </p>
          </div>
          {activeSolutions.map((s) => (
            <SolutionValidationBlock
              key={s.id}
              solution={{
                id: s.id,
                statement: s.statement,
                source: s.source,
                status: s.status,
                fit: s.hypotheses.find((h) => h.axis === "fit") ?? null,
                willingness: s.hypotheses.find((h) => h.axis === "willingness") ?? null,
                realityCheck: s.realityChecks[0] ?? null,
              }}
              onChanged={onChanged}
            />
          ))}
        </section>
      ) : (
        <Card className="text-center py-6">
          <p className="text-sm text-tertiary">
            솔루션 가설을 등록·활성화하면 핏·지불 의사 검증과 Reality Check이 여기에 등장합니다.
          </p>
          <button
            onClick={onJumpToProblem}
            className="mt-3 inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-500"
          >
            <ArrowUp size={12} /> 문제 검증부터 보기
          </button>
        </Card>
      )}
    </div>
  );
}
