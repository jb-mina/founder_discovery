export const dynamic = "force-dynamic";

import Link from "next/link";
import { Archive, ArrowLeft } from "lucide-react";
import { listArchivedProblems } from "@/lib/db/problem-cards";
import { ArchivedRowList } from "@/components/validation/ArchivedRowList";

export default async function ValidationArchivePage() {
  const items = await listArchivedProblems();
  const rows = items.map((p) => ({
    id: p.id,
    title: p.title,
    who: p.who,
    archivedAt: p.archivedAt ? p.archivedAt.toISOString() : null,
    solutionCount: p._count.solutionHypotheses,
    hypothesisCount: p._count.hypotheses,
    fitCount: p._count.fitEvaluations,
  }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/validation"
          className="text-subtle hover:text-secondary"
          aria-label="검증 허브로"
        >
          <ArrowLeft size={16} />
        </Link>
        <Archive size={20} className="text-tertiary" />
        <h1 className="text-h1 font-semibold text-foreground">아카이브</h1>
        <span className="text-xs text-subtle ml-1">({rows.length})</span>
      </div>

      <p className="text-xs text-muted">
        아카이브된 문제는 활성 검증 허브에서 숨겨집니다. 학습 기록(가설·검증·1-pager·패널 검토)은
        그대로 보존되며, 복원하면 원래 단계로 돌아옵니다. 영구 삭제는 자식 기록까지 모두 제거하며
        되돌릴 수 없습니다.
      </p>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <ArchivedRowList items={rows} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-subtle">
      <Archive size={40} className="mx-auto mb-3 opacity-30" />
      <p className="text-sm">아카이브된 문제가 없습니다</p>
      <p className="text-xs mt-1">
        활성{" "}
        <Link href="/validation" className="text-violet-600 hover:text-violet-500">
          검증 허브
        </Link>
        의 카드 메뉴에서 &ldquo;아카이브&rdquo;로 이동시킬 수 있어요
      </p>
    </div>
  );
}
