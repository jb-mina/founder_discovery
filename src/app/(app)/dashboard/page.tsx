export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Brain, Crosshair, AlertCircle, ClipboardList, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

async function getStats() {
  const [selfMapCount, problemCount, fitCount, problemsInValidation] = await Promise.all([
    prisma.selfMapEntry.count(),
    prisma.problemCard.count(),
    prisma.fitEvaluation.count(),
    prisma.problemCard.count({
      where: {
        OR: [
          { hypotheses: { some: {} } },
          { solutionHypotheses: { some: {} } },
        ],
      },
    }),
  ]);

  const topProblems = await prisma.fitEvaluation.findMany({
    include: { problemCard: true },
    orderBy: { totalScore: "desc" },
    take: 3,
  });

  // "지금 진행 중인 검증" — 가장 최근에 업데이트된 active SolutionHypothesis 한 건
  const activeSolution = await prisma.solutionHypothesis.findFirst({
    where: { status: "active" },
    include: { problemCard: true },
    orderBy: { updatedAt: "desc" },
  });

  return {
    selfMapCount,
    problemCount,
    fitCount,
    validationCount: problemsInValidation,
    topProblems,
    activeSolution,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const SELF_MAP_CATEGORIES = ["interests", "strengths", "aversions", "flow", "network"];
  const selfMapEntries = await prisma.selfMapEntry.findMany();
  const filledCategories = new Set(selfMapEntries.map((e) => e.category));
  const selfMapProgress = SELF_MAP_CATEGORIES.filter((c) => filledCategories.has(c)).length;

  const loops = [
    {
      href: "/self-map",
      icon: Brain,
      label: "Self Map",
      description: "나 자신을 이해하기",
      stat: `${stats.selfMapCount}개 항목`,
      progress: selfMapProgress,
      total: 5,
      color: "violet",
      done: selfMapProgress >= 3,
    },
    {
      href: "/problems",
      icon: Crosshair,
      label: "Problem Universe",
      description: "시장 문제 탐색하기",
      stat: `${stats.problemCount}개 문제 카드`,
      progress: Math.min(stats.problemCount, 10),
      total: 10,
      color: "blue",
      done: stats.problemCount >= 5,
    },
    {
      href: "/fit",
      icon: AlertCircle,
      label: "Founder-Problem Fit",
      description: "내게 맞는 문제 고르기",
      stat: `${stats.fitCount}개 평가`,
      progress: stats.fitCount,
      total: 5,
      color: "amber",
      done: stats.fitCount >= 3,
    },
    {
      href: "/validation",
      icon: ClipboardList,
      label: "Validation Backlog",
      description: "4가설 검증 실행하기",
      stat: `${stats.validationCount}개 검증 진행`,
      progress: stats.validationCount,
      total: 1,
      color: "green",
      done: stats.validationCount >= 1,
    },
  ];

  const colorMap: Record<string, string> = {
    violet: "text-violet-600 bg-violet-50 border-violet-200",
    blue: "text-blue-600 bg-blue-50 border-blue-200",
    amber: "text-amber-600 bg-amber-50 border-amber-200",
    green: "text-green-600 bg-green-50 border-green-200",
  };
  const progressBarMap: Record<string, string> = {
    violet: "bg-violet-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">My 0to1</h1>
        <p className="text-sm text-muted mt-1">나만의 문제와 고객을 찾는 루프</p>
      </div>

      {stats.activeSolution && (
        <Card className="border-green-200 bg-green-50">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-green-700 mb-0.5">지금 검증 중인 솔루션</p>
              <p className="font-medium text-sm text-foreground truncate">{stats.activeSolution.problemCard.title}</p>
              <p className="text-xs text-muted truncate">{stats.activeSolution.statement}</p>
            </div>
            <Link
              href={`/validation/${stats.activeSolution.problemCardId}`}
              className="flex items-center gap-1 text-xs text-green-700 hover:text-green-600 shrink-0"
            >
              보기 <ArrowRight size={12} />
            </Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loops.map(({ href, icon: Icon, label, description, stat, progress, total, color, done }) => (
          <Link key={href} href={href}>
            <Card className={`hover:border-border-strong hover:shadow-md transition-all cursor-pointer ${done ? "border-border-strong" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border ${colorMap[color]}`}>
                  <Icon size={16} />
                </div>
                {done && <CheckCircle2 size={16} className="text-green-600" />}
              </div>
              <div className="mb-3">
                <p className="font-medium text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted mt-0.5">{description}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">{stat}</span>
                  <span className="text-muted">{Math.min(progress, total)}/{total}</span>
                </div>
                <div className="h-2 bg-wash rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progressBarMap[color]}`}
                    style={{ width: `${Math.min((progress / total) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {stats.topProblems.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-secondary mb-3">내 상위 문제 (Fit 순)</h2>
          <div className="space-y-2">
            {stats.topProblems.map((e, i) => (
              <div key={e.id} className="flex items-center gap-3 bg-surface rounded-lg px-4 py-3 border border-border shadow-sm">
                <span className="text-sm font-bold text-subtle w-4">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{e.problemCard.title}</p>
                  <p className="text-xs text-muted">{e.problemCard.who}</p>
                </div>
                <span className="text-sm font-semibold text-amber-600">{e.totalScore.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border border-border rounded-xl p-4 bg-surface">
        <p className="text-xs text-muted font-medium uppercase tracking-wide mb-3">Discovery 루프</p>
        <div className="flex items-center gap-2 flex-wrap">
          {loops.map(({ label, done, color }, i) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`text-xs font-medium ${done ? colorMap[color].split(" ")[0] : "text-subtle"}`}>{label}</span>
              {i < loops.length - 1 && <ArrowRight size={12} className="text-subtle" />}
            </div>
          ))}
          <ArrowRight size={12} className="text-subtle" />
          <span className="text-xs text-subtle">반복</span>
        </div>
      </div>
    </div>
  );
}
