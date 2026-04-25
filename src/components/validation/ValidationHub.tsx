"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Zap,
  AlertTriangle,
  HelpCircle,
  Scale,
  ArrowUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProblemHeader } from "@/components/validation/ProblemHeader";
import { MainTabs, type TabKey } from "@/components/validation/MainTabs";
import { AxisWorkspace, type AxisWorkspaceData } from "@/components/validation/AxisWorkspace";
import { SolutionPanel, type SolutionPanelData } from "@/components/validation/SolutionPanel";

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
  const [realityChecking, setRealityChecking] = useState(false);

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

  const activeSolution = view.solutionHypotheses.find((s) => s.status === "active") ?? null;
  const activeFit = activeSolution?.hypotheses.find((h) => h.axis === "fit") ?? null;
  const activeWillingness = activeSolution?.hypotheses.find((h) => h.axis === "willingness") ?? null;
  const solutionConfirmed = activeSolution
    ? Number(activeFit?.status === "confirmed") + Number(activeWillingness?.status === "confirmed")
    : 0;

  const totalConfirmed = problemConfirmed + solutionConfirmed;
  const recommended: TabKey | null =
    problemConfirmed < 2 ? "problem" : solutionConfirmed < 2 ? "solution" : null;

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
        progressDots={{ confirmed: totalConfirmed, total: 4 }}
      />

      <div className="px-4 md:px-6 pt-3">
        <MainTabs
          active={tab}
          onChange={setTab}
          problemConfirmed={problemConfirmed}
          problemTotal={2}
          solutionConfirmed={solutionConfirmed}
          solutionTotal={activeSolution ? 2 : 0}
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
            activeSolution={activeSolution}
            activeFit={activeFit}
            activeWillingness={activeWillingness}
            realityChecking={realityChecking}
            onChanged={async () => {
              await fetchView();
            }}
            onRunRealityCheck={async () => {
              if (!activeSolution) return;
              setRealityChecking(true);
              await fetch("/api/reality-check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ solutionHypothesisId: activeSolution.id }),
              });
              await fetchView();
              setRealityChecking(false);
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
  activeSolution,
  activeFit,
  activeWillingness,
  realityChecking,
  onChanged,
  onRunRealityCheck,
  onJumpToProblem,
}: {
  problemCardId: string;
  solutionPanel: SolutionPanelData[];
  activeSolution: ApiSolution | null;
  activeFit: ApiHypothesis | null;
  activeWillingness: ApiHypothesis | null;
  realityChecking: boolean;
  onChanged: () => Promise<void>;
  onRunRealityCheck: () => Promise<void>;
  onJumpToProblem: () => void;
}) {
  const latestRC = activeSolution?.realityChecks[0] ?? null;

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2">
          <h2 className="text-sm font-semibold text-foreground">솔루션 가설</h2>
          <p className="text-xs text-muted">솔루션 단위 · iteration 가능</p>
        </div>
        <SolutionPanel
          problemCardId={problemCardId}
          solutions={solutionPanel}
          onChanged={onChanged}
        />
      </section>

      {activeSolution ? (
        <>
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">활성 솔루션 검증</h2>
              <p className="text-xs text-muted">
                현재 활성 솔루션에 대한 핏·지불 의사 가설. 둘 다 confirmed면 솔루션 검증 완료, 하나라도 broken되면 솔루션이 자동으로 깨짐 처리됩니다.
              </p>
            </div>
            <AxisWorkspace
              hypothesis={activeFit}
              onUpdated={onChanged}
              loadingPlaceholder="처방 생성 중..."
              contextChip={{ label: "활성 솔루션", value: activeSolution.statement }}
            />
            <AxisWorkspace
              hypothesis={activeWillingness}
              onUpdated={onChanged}
              loadingPlaceholder="처방 생성 중..."
              contextChip={{ label: "활성 솔루션", value: activeSolution.statement }}
            />
          </section>

          <section>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">Reality Check</h2>
                <p className="text-xs text-muted line-clamp-1">
                  활성 솔루션 — {activeSolution.statement}
                </p>
              </div>
              <button
                onClick={onRunRealityCheck}
                disabled={realityChecking}
                className="flex items-center gap-1.5 text-xs rounded-lg border border-border bg-canvas hover:bg-wash px-2.5 py-1.5 text-tertiary disabled:opacity-40 shrink-0"
              >
                {realityChecking ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Zap size={12} />
                )}
                실행
              </button>
            </div>
            {latestRC ? (
              <RealityCheckPanel rc={latestRC} />
            ) : (
              <p className="text-xs text-subtle">아직 실행된 Reality Check이 없습니다.</p>
            )}
          </section>
        </>
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

function RealityCheckPanel({ rc }: { rc: ApiRealityCheck }) {
  return (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-canvas">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: Zap, label: "냉정한 투자자", content: rc.coldInvestor, color: "text-red-600" },
          { icon: AlertTriangle, label: "솔직한 친구", content: rc.honestFriend, color: "text-amber-600" },
          { icon: HelpCircle, label: "소크라테스", content: rc.socraticQ, color: "text-blue-600" },
        ].map(({ icon: Icon, label, content, color }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-3">
            <div className={`flex items-center gap-1 mb-2 ${color}`}>
              <Icon size={12} />
              <p className="text-xs font-medium">{label}</p>
            </div>
            <p className="text-xs text-secondary whitespace-pre-wrap">{content}</p>
          </div>
        ))}
      </div>
      <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
        <div className="flex items-center gap-1 mb-1 text-violet-600">
          <Scale size={12} />
          <p className="text-xs font-medium">중재자 종합</p>
        </div>
        <p className="text-sm text-body whitespace-pre-wrap">{rc.moderatorSummary}</p>
      </div>
    </div>
  );
}
