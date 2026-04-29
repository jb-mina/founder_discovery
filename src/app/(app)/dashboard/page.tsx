export const dynamic = "force-dynamic";

import { getDashboardData } from "@/lib/db/dashboard";
import { NorthStarBar, ratioBucket } from "@/components/dashboard/NorthStarBar";
import { NextActionCard } from "@/components/dashboard/NextActionCard";
import { ActiveSolutionList } from "@/components/dashboard/ActiveSolutionList";
import { TrapAlerts } from "@/components/dashboard/TrapAlerts";
import { AccumulatedLearningStrip } from "@/components/dashboard/AccumulatedLearningStrip";
import { LoopFlow } from "@/components/dashboard/LoopFlow";
import { TopFitCandidates } from "@/components/dashboard/TopFitCandidates";
import { DashboardViewTracker } from "@/components/dashboard/DashboardViewTracker";

export default async function DashboardPage() {
  const data = await getDashboardData();

  const problemRatio =
    data.northStar.problemTotal === 0
      ? 0
      : data.northStar.problemConfirmed / data.northStar.problemTotal;
  const solutionRatio =
    data.northStar.solutionTotal === 0
      ? 0
      : data.northStar.solutionConfirmed / data.northStar.solutionTotal;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <DashboardViewTracker
        hasActiveSolution={data.activeSolutions.length > 0}
        activeSolutionCount={data.activeSolutions.length}
        trapCount={data.traps.length}
        northStarProblemBucket={ratioBucket(problemRatio)}
        northStarSolutionBucket={ratioBucket(solutionRatio)}
        currentStage={data.loop.currentStage}
      />

      <div>
        <h1 className="text-xl font-semibold text-foreground">My 0to1</h1>
        <p className="text-sm text-muted mt-1">
          오늘 무엇을 / 얼마나 확신 / 어디서 막혀 있는가
        </p>
      </div>

      {/* Zone 1 — Confidence (북극성) */}
      <NorthStarBar data={data.northStar} />

      {/* Zone 2 — Now (오늘의 다음 액션) */}
      <section className="space-y-4">
        <NextActionCard action={data.nextAction} />
        <TrapAlerts signals={data.traps} />
        <ActiveSolutionList rows={data.activeSolutions} />
      </section>

      {/* Zone 3 — Loop (누적 · 순환) */}
      <section className="space-y-4">
        <LoopFlow data={data.loop} />
        <AccumulatedLearningStrip data={data.accumulated} />
        <TopFitCandidates rows={data.topFit} />
      </section>
    </div>
  );
}
