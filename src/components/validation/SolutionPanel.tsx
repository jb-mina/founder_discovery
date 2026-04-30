"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus } from "lucide-react";
import { SolutionCard } from "@/components/validation/SolutionCard";
import { SolutionInputForm } from "@/components/validation/SolutionInputForm";

export type SolutionPanelData = {
  id: string;
  statement: string;
  source: string;
  status: string;
  hypothesesConfirmed: number;
  hypothesesTotal: number;
};

// SolutionPanel now renders the inactive solutions accordion (shelved /
// broken / confirmed) and the "+ 새 가설" CTA. Active solutions are
// surfaced as full workspaces by ValidationHub one level up — so this
// panel intentionally does NOT show active cards anymore.
export function SolutionPanel({
  problemCardId,
  inactiveSolutions,
  onChanged,
}: {
  problemCardId: string;
  inactiveSolutions: SolutionPanelData[];
  onChanged: () => void | Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [reactivating, setReactivating] = useState<string | null>(null);

  // Re-activate a shelved hypothesis. Broken/confirmed are auto-derived
  // from child Hypothesis status, so direct toggling for those would be
  // a no-op — but the user can still see them for context.
  async function reactivate(id: string) {
    setReactivating(id);
    await fetch(`/api/solution-hypotheses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    await onChanged();
    setReactivating(null);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm rounded-lg bg-violet-600 px-3 py-2 text-white hover:bg-violet-500"
        >
          <Plus size={14} /> 새 가설
        </button>
        {inactiveSolutions.length > 0 && (
          <button
            onClick={() => setShowInactive((v) => !v)}
            className="flex items-center gap-1 text-xs text-tertiary hover:text-secondary"
          >
            {showInactive ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            보류·완료·깨진 가설 {inactiveSolutions.length}개
          </button>
        )}
      </div>

      {showInactive && inactiveSolutions.length > 0 && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 opacity-80">
          {inactiveSolutions.map((s) => (
            <SolutionCard
              key={s.id}
              solution={s}
              onClick={() => {
                if (s.status === "shelved" && reactivating !== s.id) {
                  reactivate(s.id);
                }
              }}
            />
          ))}
          {reactivating && (
            <span className="flex items-center gap-1 text-xs text-subtle col-span-full">
              <Loader2 size={12} className="animate-spin" /> 활성화 중...
            </span>
          )}
        </div>
      )}

      {showForm && (
        <SolutionInputForm
          problemCardId={problemCardId}
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            await onChanged();
          }}
        />
      )}
    </>
  );
}
