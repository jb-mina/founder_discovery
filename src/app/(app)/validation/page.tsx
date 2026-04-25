export const dynamic = "force-dynamic";

import Link from "next/link";
import { ClipboardList, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  listProblemsInValidation,
  progressDots,
  type ProblemValidationListItem,
} from "@/lib/db/validation";

function ProgressDots({ confirmed, total }: { confirmed: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            i < confirmed ? "bg-violet-600" : "bg-wash"
          }`}
        />
      ))}
    </div>
  );
}

function ProblemRow({ problem }: { problem: ProblemValidationListItem }) {
  const { confirmed, total } = progressDots(problem);
  const activeSolution = problem.solutionHypotheses.find((s) => s.status === "active");
  const totalSolutions = problem.solutionHypotheses.length;

  return (
    <Link href={`/validation/${problem.id}`}>
      <Card className="hover:border-border-strong hover:shadow-md transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-foreground line-clamp-1">{problem.title}</p>
            <p className="text-xs text-muted mt-0.5 line-clamp-1">{problem.who}</p>
            {activeSolution && (
              <div className="mt-2 flex items-start gap-1.5">
                <Badge variant="green">활성 솔루션</Badge>
                <p className="text-xs text-tertiary line-clamp-1 flex-1 min-w-0">
                  {activeSolution.statement}
                </p>
              </div>
            )}
            {!activeSolution && totalSolutions === 0 && problem.hypotheses.length > 0 && (
              <p className="text-xs text-subtle mt-2">문제 검증 중 — 솔루션 가설 미등록</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <ProgressDots confirmed={confirmed} total={total} />
            <ArrowRight size={14} className="text-subtle" />
          </div>
        </div>
        {totalSolutions > 1 && (
          <p className="text-xs text-subtle mt-3">솔루션 가설 {totalSolutions}개</p>
        )}
      </Card>
    </Link>
  );
}

export default async function ValidationListPage() {
  const problems = await listProblemsInValidation();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardList size={20} className="text-violet-600" />
        <h1 className="text-lg font-semibold text-foreground">Validating</h1>
      </div>
      <p className="text-sm text-muted -mt-3">
        검증 진행 중인 문제 카드. 카드 클릭 시 해당 문제의 4가설 허브로 이동합니다.
      </p>

      {problems.length === 0 ? (
        <div className="text-center py-16 text-subtle">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">아직 검증을 시작한 문제가 없습니다</p>
          <p className="text-xs mt-1">
            <Link href="/fit" className="text-violet-600 hover:text-violet-500">
              Fit 평가
            </Link>
            한 문제에서 검증을 시작해보세요
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {problems.map((p) => (
            <ProblemRow key={p.id} problem={p} />
          ))}
        </div>
      )}
    </div>
  );
}
