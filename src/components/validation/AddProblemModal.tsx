"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Star, X } from "lucide-react";
import type { EligibleProblemForValidation } from "@/lib/db/validation";

export function AddProblemModal({
  eligible,
  onClose,
}: {
  eligible: EligibleProblemForValidation[];
  onClose: () => void;
}) {
  const router = useRouter();

  function pick(id: string) {
    onClose();
    router.push(`/validation/${id}`);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-sm text-foreground">검증할 문제 추가</h2>
            <p className="text-xs text-muted mt-0.5">
              Fit 평가는 했지만 아직 검증을 시작하지 않은 문제 — Fit 점수 높은 순.
            </p>
          </div>
          <button onClick={onClose} className="text-subtle hover:text-secondary p-1" aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {eligible.length === 0 ? (
            <div className="text-center py-10 text-subtle">
              <p className="text-sm">추가 가능한 문제가 없습니다</p>
              <p className="text-xs mt-1">Fit 평가한 문제 중 검증 미시작 항목이 없어요.</p>
            </div>
          ) : (
            eligible.map((p) => {
              const score = p.fitEvaluations[0]?.totalScore ?? 0;
              return (
                <button
                  key={p.id}
                  onClick={() => pick(p.id)}
                  className="w-full text-left rounded-lg border border-border bg-canvas hover:bg-wash hover:border-border-strong p-3 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground line-clamp-1">{p.title}</p>
                      <p className="text-xs text-muted line-clamp-1">{p.who}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                        <Star size={10} className="fill-amber-500 text-amber-500" />
                        {score.toFixed(1)}
                      </span>
                      <ArrowRight size={14} className="text-subtle group-hover:text-secondary" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
