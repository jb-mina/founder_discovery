"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Sparkles,
  Zap,
  AlertTriangle,
  HelpCircle,
  Scale,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  HypothesisCard,
  type HypothesisCardData,
} from "@/components/validation/HypothesisCard";
import {
  HypothesisDrawer,
  type DrawerHypothesis,
} from "@/components/validation/HypothesisDrawer";
import { SolutionCard } from "@/components/validation/SolutionCard";
import { SolutionInputForm } from "@/components/validation/SolutionInputForm";
import { ProblemHeader } from "@/components/validation/ProblemHeader";
import { SOLUTION_STATUS_LABELS, type SolutionStatus } from "@/lib/validation-labels";

type ApiHypothesis = HypothesisCardData & {
  successSignals: string;
  failureSignals: string;
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

  const [drawerHyp, setDrawerHyp] = useState<DrawerHypothesis | null>(null);
  const [drawerChips, setDrawerChips] = useState<{ label: string; value: string }[]>([]);
  const [showSolutionForm, setShowSolutionForm] = useState(false);
  const [showShelved, setShowShelved] = useState(false);
  const [realityChecking, setRealityChecking] = useState(false);
  const [solutionStatusUpdating, setSolutionStatusUpdating] = useState<string | null>(null);

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
    return (
      <div className="p-6 text-sm text-red-600">{error ?? "문제를 찾을 수 없습니다"}</div>
    );
  }

  const activeSolution = view.solutionHypotheses.find((s) => s.status === "active") ?? null;
  const visibleSolutions = view.solutionHypotheses.filter((s) => s.status !== "shelved");
  const shelvedSolutions = view.solutionHypotheses.filter((s) => s.status === "shelved");

  const allHypotheses = [
    ...view.hypotheses,
    ...(activeSolution?.hypotheses ?? []),
  ];
  const confirmed = allHypotheses.filter((h) => h.status === "confirmed").length;
  const total = 4;

  function openHypothesis(h: ApiHypothesis, isSolutionLevel: boolean) {
    if (!view) return;
    const chips: { label: string; value: string }[] = [
      { label: "타깃 고객", value: view.who },
    ];
    if (isSolutionLevel && activeSolution) {
      chips.push({ label: "솔루션", value: truncate(activeSolution.statement, 60) });
    }
    setDrawerChips(chips);
    setDrawerHyp(h);
  }

  async function updateSolutionStatus(id: string, status: SolutionStatus) {
    setSolutionStatusUpdating(id);
    await fetch(`/api/solution-hypotheses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchView();
    setSolutionStatusUpdating(null);
  }

  async function runRealityCheck() {
    if (!activeSolution) return;
    setRealityChecking(true);
    await fetch("/api/reality-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solutionHypothesisId: activeSolution.id }),
    });
    await fetchView();
    setRealityChecking(false);
  }

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
        progressDots={{ confirmed, total }}
      />

      <div className="p-4 md:p-6 space-y-8">
        {/* Problem validation */}
        <section>
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-sm font-semibold text-foreground">문제 검증</h2>
            <p className="text-xs text-muted">솔루션 무관 · 문제 단위</p>
          </div>
          {bootstrapping && view.hypotheses.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {view.hypotheses.map((h) => (
                <HypothesisCard
                  key={h.id}
                  hypothesis={h}
                  onClick={() => openHypothesis(h, false)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Solution hypotheses */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold text-foreground">솔루션 가설</h2>
              <p className="text-xs text-muted">솔루션 단위 · iteration 가능</p>
            </div>
            <button
              onClick={() => setShowSolutionForm(true)}
              className="flex items-center gap-1.5 text-xs rounded-lg bg-violet-600 px-2.5 py-1.5 text-white hover:bg-violet-500"
            >
              <Plus size={12} /> 새 가설
            </button>
          </div>

          {visibleSolutions.length === 0 && shelvedSolutions.length === 0 ? (
            <Card className="text-center py-8">
              <Sparkles size={20} className="mx-auto mb-2 text-violet-400" />
              <p className="text-sm text-tertiary mb-2">
                이 문제에 대한 솔루션 가설을 추가해주세요
              </p>
              <p className="text-xs text-muted mb-4">
                직접 입력하거나, 에이전트로부터 후보 3개를 받아 편집해 등록할 수 있습니다.
              </p>
              <button
                onClick={() => setShowSolutionForm(true)}
                className="text-sm rounded-lg bg-violet-600 px-3 py-2 text-white hover:bg-violet-500"
              >
                솔루션 가설 시작
              </button>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleSolutions.map((s) => (
                  <SolutionCard
                    key={s.id}
                    solution={{
                      id: s.id,
                      statement: s.statement,
                      source: s.source,
                      status: s.status,
                      hypothesesConfirmed: s.hypotheses.filter((h) => h.status === "confirmed").length,
                      hypothesesTotal: s.hypotheses.length,
                    }}
                    emphasized={s.status === "active"}
                    onClick={() => {
                      // For now just toggle status from non-active to active. Detail panel can come later.
                      if (s.status !== "active") {
                        updateSolutionStatus(s.id, "active");
                      }
                    }}
                  />
                ))}
              </div>

              {shelvedSolutions.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowShelved((v) => !v)}
                    className="flex items-center gap-1 text-xs text-subtle hover:text-secondary"
                  >
                    {showShelved ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    보류된 가설 {shelvedSolutions.length}개 {showShelved ? "접기" : "보기"}
                  </button>
                  {showShelved && (
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 opacity-70">
                      {shelvedSolutions.map((s) => (
                        <SolutionCard
                          key={s.id}
                          solution={{
                            id: s.id,
                            statement: s.statement,
                            source: s.source,
                            status: s.status,
                            hypothesesConfirmed: s.hypotheses.filter((h) => h.status === "confirmed").length,
                            hypothesesTotal: s.hypotheses.length,
                          }}
                          onClick={() => updateSolutionStatus(s.id, "active")}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Active solution validation */}
        {activeSolution && (
          <section>
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-sm font-semibold text-foreground">활성 솔루션 검증</h2>
              <p className="text-xs text-muted">솔루션 단위 · 핏 / 지불 의사</p>
            </div>

            {activeSolution.status === "broken" && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                이 솔루션은 깨졌습니다. 새 가설을 시도해보세요.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeSolution.hypotheses.length === 0 ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                activeSolution.hypotheses.map((h) => (
                  <HypothesisCard
                    key={h.id}
                    hypothesis={h}
                    onClick={() => openHypothesis(h, true)}
                  />
                ))
              )}
            </div>

            {/* Solution status controls */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(["confirmed", "broken", "shelved"] as SolutionStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => updateSolutionStatus(activeSolution.id, s)}
                  disabled={solutionStatusUpdating === activeSolution.id}
                  className="text-xs rounded-lg border border-border bg-canvas hover:bg-wash px-2.5 py-1 text-tertiary disabled:opacity-40"
                >
                  활성 솔루션을 {SOLUTION_STATUS_LABELS[s]}으로
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Reality Check */}
        {activeSolution && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Reality Check</h2>
              <button
                onClick={runRealityCheck}
                disabled={realityChecking}
                className="flex items-center gap-1.5 text-xs rounded-lg border border-border bg-canvas hover:bg-wash px-2.5 py-1.5 text-tertiary disabled:opacity-40"
              >
                {realityChecking ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                활성 솔루션에 대해 실행
              </button>
            </div>
            {activeSolution.realityChecks[0] ? (
              <RealityCheckPanel rc={activeSolution.realityChecks[0]} />
            ) : (
              <p className="text-xs text-subtle">아직 실행된 Reality Check이 없습니다.</p>
            )}
          </section>
        )}
      </div>

      <HypothesisDrawer
        hypothesis={drawerHyp}
        contextChips={drawerChips}
        onClose={() => setDrawerHyp(null)}
        onUpdated={async () => {
          await fetchView();
        }}
      />

      {showSolutionForm && (
        <SolutionInputForm
          problemCardId={problemCardId}
          onClose={() => setShowSolutionForm(false)}
          onSaved={async () => {
            await fetchView();
          }}
        />
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-canvas p-4 animate-pulse space-y-2">
      <div className="h-4 bg-wash rounded w-1/3" />
      <div className="h-3 bg-wash rounded w-2/3" />
      <div className="h-3 bg-wash rounded w-1/2" />
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

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
