"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  axisStatusFor,
  deriveListStatus,
  type ProblemValidationListItem,
} from "@/lib/db/validation";
import { CardActionMenu } from "./CardActionMenu";
import { StepperBar } from "./StepperBar";

type TabKey = "problem" | "solution" | "completed";

export type ValidationBuckets = {
  problem: ProblemValidationListItem[];
  pending: ProblemValidationListItem[]; // no_active_solution
  solution: ProblemValidationListItem[];
  completed: ProblemValidationListItem[];
};

const TAB_ORDER: { key: TabKey; label: string }[] = [
  { key: "problem", label: "문제 검증" },
  { key: "solution", label: "솔루션 검증" },
  { key: "completed", label: "검증 완료" },
];

function tabCount(buckets: ValidationBuckets, key: TabKey): number {
  if (key === "problem") return buckets.problem.length;
  if (key === "solution") return buckets.pending.length + buckets.solution.length;
  return buckets.completed.length;
}

function pickInitialTab(buckets: ValidationBuckets): TabKey {
  for (const { key } of TAB_ORDER) {
    if (tabCount(buckets, key) > 0) return key;
  }
  return "problem";
}

export function ValidationListTabs({ buckets }: { buckets: ValidationBuckets }) {
  const [active, setActive] = useState<TabKey>(() => pickInitialTab(buckets));

  return (
    <div className="space-y-6">
      <div className="flex border-b border-border">
        {TAB_ORDER.map(({ key, label }) => {
          const count = tabCount(buckets, key);
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-violet-600 text-violet-600"
                  : "border-transparent text-muted hover:text-secondary"
              }`}
            >
              {label}
              <span className={`ml-1.5 text-xs ${isActive ? "text-violet-500" : "text-subtle"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {active === "problem" && <ProblemTab items={buckets.problem} />}
      {active === "solution" && (
        <SolutionTab pending={buckets.pending} solution={buckets.solution} />
      )}
      {active === "completed" && <CompletedTab items={buckets.completed} />}
    </div>
  );
}

function ProblemTab({ items }: { items: ProblemValidationListItem[] }) {
  if (items.length === 0) {
    return <EmptyTab caption="문제 검증 단계에 있는 카드가 없습니다." />;
  }
  return <RowList items={items} />;
}

function SolutionTab({
  pending,
  solution,
}: {
  pending: ProblemValidationListItem[];
  solution: ProblemValidationListItem[];
}) {
  if (pending.length === 0 && solution.length === 0) {
    return <EmptyTab caption="솔루션 검증 단계에 있는 카드가 없습니다." />;
  }
  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <section className="space-y-4">
          <SubHeader label="솔루션 등록 대기" count={pending.length} />
          <RowList items={pending} />
        </section>
      )}
      {solution.length > 0 && (
        <section className="space-y-4">
          <SubHeader label="솔루션 검증 중" count={solution.length} />
          <RowList items={solution} />
        </section>
      )}
    </div>
  );
}

function CompletedTab({ items }: { items: ProblemValidationListItem[] }) {
  if (items.length === 0) {
    return <EmptyTab caption="검증 완료된 카드가 없습니다." />;
  }
  return <RowList items={items} />;
}

function SubHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="text-sm font-semibold text-foreground">{label}</h2>
      <span className="text-xs text-muted">{count}</span>
    </div>
  );
}

function EmptyTab({ caption }: { caption: string }) {
  return (
    <div className="text-center py-12 text-subtle">
      <p className="text-sm">{caption}</p>
    </div>
  );
}

function RowList({ items }: { items: ProblemValidationListItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((p) => (
        <ProblemRow key={p.id} problem={p} />
      ))}
    </div>
  );
}

function ProblemRow({ problem }: { problem: ProblemValidationListItem }) {
  const router = useRouter();
  const status = deriveListStatus(problem);
  const steps = axisStatusFor(problem);
  const activeSolution = problem.solutionHypotheses.find((s) => s.status === "active");

  async function archive() {
    const res = await fetch(`/api/problems/${problem.id}/archive`, { method: "POST" });
    if (res.ok) router.refresh();
  }

  return (
    <Link href={`/validation/${problem.id}`} className="block">
      <Card className="hover:border-border-strong hover:shadow-md transition-all cursor-pointer space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-base text-foreground line-clamp-2">{problem.title}</p>
            <p className="text-xs text-muted mt-1 line-clamp-1">{problem.who}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            {status.shelvedCount > 0 && (
              <span className="text-xs text-subtle">보류 {status.shelvedCount}</span>
            )}
            <CardActionMenu variant="active" onArchive={archive} />
          </div>
        </div>

        <StepperBar steps={steps} />

        <div className="flex items-start justify-between gap-3 pt-2 border-t border-border">
          <div className="min-w-0 flex-1">
            {activeSolution ? (
              <div className="flex items-start gap-1.5">
                <Sparkles size={12} className="text-violet-500 mt-0.5 shrink-0" />
                <p className="text-xs text-tertiary line-clamp-1">{activeSolution.statement}</p>
              </div>
            ) : (
              <p className="text-xs text-subtle">활성 솔루션 없음</p>
            )}
            <p className="text-xs text-violet-600 font-medium mt-1.5">{status.nextStep}</p>
          </div>
          <ArrowRight size={14} className="text-subtle shrink-0 self-center" />
        </div>
      </Card>
    </Link>
  );
}
