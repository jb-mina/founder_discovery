export const dynamic = "force-dynamic";

import Link from "next/link";
import { ClipboardList, ArrowRight, Sparkles, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  axisStatusFor,
  deriveListStatus,
  listEligibleForValidation,
  listProblemsInValidation,
  type ListStatusKey,
  type ProblemValidationListItem,
} from "@/lib/db/validation";
import { AddProblemTrigger } from "@/components/validation/AddProblemTrigger";
import { ProblemRowBadge } from "@/components/validation/ProblemRowBadge";
import { StepperBar } from "@/components/validation/StepperBar";

function ProblemRow({ problem }: { problem: ProblemValidationListItem }) {
  const status = deriveListStatus(problem);
  const steps = axisStatusFor(problem);
  const activeSolution = problem.solutionHypotheses.find((s) => s.status === "active");

  return (
    <Link href={`/validation/${problem.id}`} className="block">
      <Card className="hover:border-border-strong hover:shadow-md transition-all cursor-pointer space-y-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-base text-foreground line-clamp-2">{problem.title}</p>
            <p className="text-xs text-muted mt-1 line-clamp-1">{problem.who}</p>
          </div>
          <div className="shrink-0 mt-1">
            <ProblemRowBadge status={status} />
          </div>
        </div>

        {/* Stepper */}
        <StepperBar steps={steps} />

        {/* Active solution preview + next-step hint */}
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

type SectionMeta = {
  key: ListStatusKey;
  label: string;
  caption: string;
  accent: string; // dot color for visual scan
};

// Order = loop progression. solution_validating(가장 진척) → completed(접힘).
const SECTIONS: SectionMeta[] = [
  {
    key: "solution_validating",
    label: "솔루션 검증 중",
    caption: "활성 솔루션의 핏·지불 의사 확인 단계",
    accent: "bg-violet-500",
  },
  {
    key: "no_active_solution",
    label: "활성 솔루션 없음",
    caption: "문제 검증은 끝났지만 아직 시도 중인 솔루션이 없는 카드",
    accent: "bg-neutral-400",
  },
  {
    key: "problem_validating",
    label: "문제 검증 중",
    caption: "이 문제가 실제로 존재하고 심각한지 확인하는 단계",
    accent: "bg-amber-500",
  },
  {
    key: "completed",
    label: "검증 완료",
    caption: "4가설 모두 확인된 카드",
    accent: "bg-green-500",
  },
];

function SectionHeader({
  meta,
  count,
}: {
  meta: SectionMeta;
  count: number;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <div className="flex items-center gap-2">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${meta.accent}`} />
        <h2 className="text-sm font-semibold text-foreground">{meta.label}</h2>
        <span className="text-xs text-muted">{count}</span>
      </div>
      <p className="text-xs text-subtle truncate">{meta.caption}</p>
    </div>
  );
}

export default async function ValidationListPage() {
  const [problems, eligible] = await Promise.all([
    listProblemsInValidation(),
    listEligibleForValidation(),
  ]);

  // Bucket by status key. Order within bucket inherits API order (updatedAt desc).
  const buckets = new Map<ListStatusKey, ProblemValidationListItem[]>();
  for (const p of problems) {
    const key = deriveListStatus(p).key;
    const arr = buckets.get(key) ?? [];
    arr.push(p);
    buckets.set(key, arr);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-violet-600" />
            <h1 className="text-lg font-semibold text-foreground">Validating</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            검증 진행 중인 문제 카드. 진척 단계별로 묶여 있습니다.
          </p>
        </div>
        <AddProblemTrigger eligible={eligible} />
      </div>

      {problems.length === 0 ? (
        <div className="text-center py-16 text-subtle">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">아직 검증을 시작한 문제가 없습니다</p>
          <p className="text-xs mt-1">
            {eligible.length > 0 ? (
              <>위 “검증할 문제 추가” 버튼에서 시작해보세요</>
            ) : (
              <>
                <Link href="/problems" className="text-violet-600 hover:text-violet-500">
                  Fit 평가
                </Link>
                한 문제에서 검증을 시작할 수 있어요
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {SECTIONS.map((meta) => {
            const items = buckets.get(meta.key) ?? [];
            if (items.length === 0) return null;

            const cards = (
              <div className="space-y-4">
                {items.map((p) => (
                  <ProblemRow key={p.id} problem={p} />
                ))}
              </div>
            );

            // 검증 완료는 기본 접힘 (정보 밀도 줄이기 위함).
            if (meta.key === "completed") {
              return (
                <details key={meta.key} className="space-y-4 group">
                  <summary className="list-none cursor-pointer flex items-center gap-2">
                    <ChevronDown
                      size={14}
                      className="text-subtle transition-transform group-open:rotate-0 -rotate-90"
                    />
                    <SectionHeader meta={meta} count={items.length} />
                  </summary>
                  <div className="mt-4">{cards}</div>
                </details>
              );
            }

            return (
              <section key={meta.key} className="space-y-4">
                <SectionHeader meta={meta} count={items.length} />
                {cards}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
