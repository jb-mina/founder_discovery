export const dynamic = "force-dynamic";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import {
  deriveListStatus,
  listEligibleForValidation,
  listProblemsInValidation,
  type ListStatusKey,
} from "@/lib/db/validation";
import { AddProblemTrigger } from "@/components/validation/AddProblemTrigger";
import {
  ValidationListTabs,
  type ValidationBuckets,
} from "@/components/validation/ValidationListTabs";

export default async function ValidationListPage() {
  const [problems, eligible] = await Promise.all([
    listProblemsInValidation(),
    listEligibleForValidation(),
  ]);

  const buckets: ValidationBuckets = {
    problem: [],
    pending: [],
    solution: [],
    completed: [],
  };
  for (const p of problems) {
    const key: ListStatusKey = deriveListStatus(p).key;
    if (key === "problem_validating") buckets.problem.push(p);
    else if (key === "no_active_solution") buckets.pending.push(p);
    else if (key === "solution_validating") buckets.solution.push(p);
    else if (key === "completed") buckets.completed.push(p);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList size={20} className="text-violet-600" />
          <h1 className="text-h1 font-semibold text-foreground">Validating</h1>
        </div>
        <AddProblemTrigger eligible={eligible} />
      </div>

      {problems.length === 0 ? (
        <EmptyState hasEligible={eligible.length > 0} />
      ) : (
        <ValidationListTabs buckets={buckets} />
      )}
    </div>
  );
}

function EmptyState({ hasEligible }: { hasEligible: boolean }) {
  return (
    <div className="text-center py-16 text-subtle">
      <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm">아직 검증을 시작한 문제가 없습니다</p>
      <p className="text-xs mt-1">
        {hasEligible ? (
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
  );
}

