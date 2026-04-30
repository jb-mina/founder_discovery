export const dynamic = "force-dynamic";

import { getDashboardData } from "@/lib/db/dashboard";
import { NorthStarBar, focusProgressBucket } from "@/components/dashboard/NorthStarBar";
import { TodayCard } from "@/components/dashboard/TodayCard";
import { ActiveSolutionList } from "@/components/dashboard/ActiveSolutionList";
import { TopFitCandidates } from "@/components/dashboard/TopFitCandidates";
import { DashboardViewTracker } from "@/components/dashboard/DashboardViewTracker";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <DashboardViewTracker
        hasFocus={data.focus !== null}
        focusProgress={focusProgressBucket(data.focus)}
        activeSolutionCount={data.activeSolutions.total}
        trapCount={data.traps.length}
        eligibleCount={data.topFit.length}
      />

      <div>
        <h1 className="text-display font-semibold text-foreground">My 0to1</h1>
        <p className="text-sm text-muted mt-1">
          오늘 무엇을 / 얼마나 확신 / 어디서 막혀 있는가
        </p>
      </div>

      {/* Today — 오늘 한 가지 액션 (트랩 또는 다음 액션) */}
      <TodayCard nextAction={data.nextAction} traps={data.traps} />

      {/* Active Work — 작업대 (top 3 + 더 보기) */}
      <ActiveSolutionList data={data.activeSolutions} />

      {/* Confidence — 북극성 + 누적 학습 */}
      <NorthStarBar focus={data.focus} accumulated={data.accumulated} />

      {/* Pipeline — 다음 검증 후보 */}
      <TopFitCandidates rows={data.topFit} />
    </div>
  );
}
