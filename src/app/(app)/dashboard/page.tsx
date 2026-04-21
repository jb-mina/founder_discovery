export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Brain, Crosshair, AlertCircle, ClipboardList, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

async function getStats() {
  const [selfMapCount, problemCount, fitCount, validationCount] = await Promise.all([
    prisma.selfMapEntry.count(),
    prisma.problemCard.count(),
    prisma.fitEvaluation.count(),
    prisma.validationPlan.count(),
  ]);

  const topProblems = await prisma.fitEvaluation.findMany({
    include: { problemCard: true },
    orderBy: { totalScore: "desc" },
    take: 3,
  });

  const activeValidation = await prisma.validationPlan.findFirst({
    where: { status: "active" },
    include: { problemCard: true },
  });

  return { selfMapCount, problemCount, fitCount, validationCount, topProblems, activeValidation };
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
      description: "검증 실행하기",
      stat: `${stats.validationCount}개 플랜`,
      progress: stats.validationCount,
      total: 1,
      color: "green",
      done: stats.validationCount >= 1,
    },
  ];

  const colorMap: Record<string, string> = {
    violet: "text-violet-400 bg-violet-900/20 border-violet-800",
    blue: "text-blue-400 bg-blue-900/20 border-blue-800",
    amber: "text-amber-400 bg-amber-900/20 border-amber-800",
    green: "text-green-400 bg-green-900/20 border-green-800",
  };
  const progressBarMap: Record<string, string> = {
    violet: "bg-violet-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Discovery OS</h1>
        <p className="text-sm text-neutral-400 mt-1">나만의 문제와 고객을 찾는 루프</p>
      </div>

      {stats.activeValidation && (
        <Card className="border-green-800 bg-green-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-green-400 mb-0.5">지금 진행 중인 검증</p>
              <p className="font-medium text-sm">{stats.activeValidation.problemCard.title}</p>
            </div>
            <Link href="/validation" className="flex items-center gap-1 text-xs text-green-300 hover:text-green-200">
              보기 <ArrowRight size={12} />
            </Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loops.map(({ href, icon: Icon, label, description, stat, progress, total, color, done }) => (
          <Link key={href} href={href}>
            <Card className={`hover:border-neutral-600 transition-all cursor-pointer ${done ? "border-neutral-700" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border ${colorMap[color]}`}>
                  <Icon size={16} />
                </div>
                {done && <CheckCircle2 size={16} className="text-green-400" />}
              </div>
              <div className="mb-3">
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">{stat}</span>
                  <span className="text-neutral-500">{Math.min(progress, total)}/{total}</span>
                </div>
                <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
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
          <h2 className="text-sm font-medium text-neutral-300 mb-3">내 상위 문제 (Fit 순)</h2>
          <div className="space-y-2">
            {stats.topProblems.map((e, i) => (
              <div key={e.id} className="flex items-center gap-3 bg-neutral-900 rounded-lg px-4 py-3 border border-neutral-800">
                <span className="text-sm font-bold text-neutral-600 w-4">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{e.problemCard.title}</p>
                  <p className="text-xs text-neutral-500">{e.problemCard.who}</p>
                </div>
                <span className="text-sm font-semibold text-amber-300">{e.totalScore.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border border-neutral-800 rounded-xl p-4">
        <p className="text-xs text-neutral-500 font-medium uppercase tracking-wide mb-3">Discovery 루프</p>
        <div className="flex items-center gap-2 flex-wrap">
          {loops.map(({ label, done, color }, i) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`text-xs font-medium ${done ? colorMap[color].split(" ")[0] : "text-neutral-600"}`}>{label}</span>
              {i < loops.length - 1 && <ArrowRight size={12} className="text-neutral-700" />}
            </div>
          ))}
          <ArrowRight size={12} className="text-neutral-700" />
          <span className="text-xs text-neutral-600">반복</span>
        </div>
      </div>
    </div>
  );
}
