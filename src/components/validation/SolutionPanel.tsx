"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus, Sparkles } from "lucide-react";
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

  const visible = solutions.filter((s) => s.status !== "shelved");
  const shelved = solutions.filter((s) => s.status === "shelved");
  const activeCount = solutions.filter((s) => s.status === "active").length;

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
            여러 솔루션을 병렬로 등록해 검증 메서드·Reality Check까지 비교한 뒤 실행 여부를 결정할 수 있습니다.
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
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">
            {activeCount > 0
              ? `활성 솔루션 ${activeCount}개 — 각각의 검증 처방을 아래에서 비교하세요`
              : "활성 솔루션 없음 — 카드를 클릭해 활성화하거나 새 가설을 추가하세요"}
          </p>
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
          {statusUpdating && (
            <span className="flex items-center gap-1 text-xs text-subtle col-span-full">
              <Loader2 size={12} className="animate-spin" /> 활성화 중...
            </span>
          )}
        </div>

        <p className="text-xs text-subtle text-right">
          broken / confirmed는 가설 검증 결과로 자동 결정 · 사용자는 활성 / 보류만 관리
        </p>

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
