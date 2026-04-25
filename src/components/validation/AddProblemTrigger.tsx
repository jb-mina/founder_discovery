"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { EligibleProblemForValidation } from "@/lib/db/validation";
import { AddProblemModal } from "./AddProblemModal";

export function AddProblemTrigger({
  eligible,
}: {
  eligible: EligibleProblemForValidation[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
      >
        <Plus size={14} /> 검증할 문제 추가
        {eligible.length > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center text-xs bg-white/20 rounded-full px-1.5 py-0.5">
            {eligible.length}
          </span>
        )}
      </button>
      {open && <AddProblemModal eligible={eligible} onClose={() => setOpen(false)} />}
    </>
  );
}
