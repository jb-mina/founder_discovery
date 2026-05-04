"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SolutionInputForm } from "@/components/validation/SolutionInputForm";

// SolutionPanel only handles the "+ 새 가설" CTA + form. Active and
// inactive solutions are rendered as full SolutionValidationBlocks by
// ValidationHub so users can view content and change status from any state.
export function SolutionPanel({
  problemCardId,
  onChanged,
}: {
  problemCardId: string;
  onChanged: () => void | Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm rounded-lg bg-violet-600 px-3 py-2 text-white hover:bg-violet-500"
        >
          <Plus size={14} /> 새 가설
        </button>
      </div>

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
