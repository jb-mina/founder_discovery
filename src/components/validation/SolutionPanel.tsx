"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Sparkles, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
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

export function SolutionPanel({
  problemCardId,
  solutions,
  onChanged,
}: {
  problemCardId: string;
  solutions: SolutionPanelData[];
  onChanged: () => void | Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showShelved, setShowShelved] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const active = solutions.find((s) => s.status === "active");
  const visible = solutions.filter((s) => s.status !== "shelved");
  const shelved = solutions.filter((s) => s.status === "shelved");

  async function setStatus(id: string, status: "active" | "shelved") {
    setStatusUpdating(id);
    await fetch(`/api/solution-hypotheses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await onChanged();
    setStatusUpdating(null);
  }

  if (solutions.length === 0) {
    return (
      <>
        <Card className="text-center py-8">
          <Sparkles size={20} className="mx-auto mb-2 text-violet-400" />
          <p className="text-sm text-tertiary mb-2">이 문제에 대한 솔루션 가설을 추가해주세요</p>
          <p className="text-xs text-muted mb-4">
            직접 입력하거나, 에이전트로부터 후보 3개를 받아 편집해 등록할 수 있습니다.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm rounded-lg bg-violet-600 px-3 py-2 text-white hover:bg-violet-500"
          >
            솔루션 가설 시작
          </button>
        </Card>
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

  return (
    <>
      <div className="space-y-3">
        {active?.status === "broken" && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
            <AlertTriangle size={14} className="text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-red-700 font-medium">이 솔루션은 검증으로 깨졌습니다</p>
              <p className="text-xs text-red-600 mt-0.5">
                fit 또는 지불 의사 가설이 broken으로 결정됨. 새 솔루션 가설을 시도하거나 보류된 가설을 활성화하세요.
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="text-xs rounded-md bg-red-600 text-white px-2.5 py-1 hover:bg-red-500 shrink-0 self-center"
            >
              새 가설
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">{active ? "활성 솔루션이 검증 중" : "활성 솔루션 없음"}</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs rounded-lg bg-violet-600 px-2.5 py-1.5 text-white hover:bg-violet-500"
          >
            <Plus size={12} /> 새 가설
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visible.map((s) => (
            <SolutionCard
              key={s.id}
              solution={s}
              emphasized={s.status === "active"}
              onClick={() => {
                if (s.status !== "active" && statusUpdating !== s.id) {
                  setStatus(s.id, "active");
                }
              }}
            />
          ))}
        </div>

        {/* Active controls — broken/confirmed are auto-derived from hypothesis status */}
        {active && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-muted">활성 솔루션 액션:</span>
            <button
              onClick={() => setStatus(active.id, "shelved")}
              disabled={statusUpdating === active.id}
              className="text-xs rounded-lg border border-border bg-canvas hover:bg-wash px-2.5 py-1 text-tertiary disabled:opacity-40"
            >
              보류
            </button>
            {statusUpdating === active.id && (
              <Loader2 size={12} className="animate-spin text-subtle" />
            )}
            <span className="text-xs text-subtle ml-auto">
              broken / confirmed는 검증 결과로 자동 결정
            </span>
          </div>
        )}

        {shelved.length > 0 && (
          <div>
            <button
              onClick={() => setShowShelved((v) => !v)}
              className="flex items-center gap-1 text-xs text-subtle hover:text-secondary"
            >
              {showShelved ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              보류된 가설 {shelved.length}개 {showShelved ? "접기" : "보기"}
            </button>
            {showShelved && (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 opacity-70">
                {shelved.map((s) => (
                  <SolutionCard
                    key={s.id}
                    solution={s}
                    onClick={() => {
                      if (statusUpdating !== s.id) setStatus(s.id, "active");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
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
