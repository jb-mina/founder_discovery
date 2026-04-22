"use client";

import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Plus, Loader2, ChevronDown, ChevronUp, Zap, AlertTriangle, HelpCircle, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type WeeklyStep = { week: number; actions: string[] };
type RealityCheck = {
  id: string;
  coldInvestor: string;
  honestFriend: string;
  socraticQ: string;
  moderatorSummary: string;
  createdAt: string;
};
type ValidationPlan = {
  id: string;
  problemCardId: string;
  ideaDraft: string;
  interviewQuestions: string;
  experimentMethod: string;
  successSignals: string;
  failureSignals: string;
  weeklySteps: string;
  status: string;
  learnings: string;
  problemCard: { title: string; who: string };
  realityChecks: RealityCheck[];
  createdAt: string;
};
type ProblemCard = { id: string; title: string; who: string; fitEvaluations: { totalScore: number }[] };

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "amber" | "green" | "blue"; label: string }> = {
    draft: { variant: "amber", label: "초안" },
    active: { variant: "green", label: "진행 중" },
    completed: { variant: "blue", label: "완료" },
  };
  const { variant, label } = map[status] ?? map.draft;
  return <Badge variant={variant}>{label}</Badge>;
}

function PlanCard({ plan, onUpdate }: { plan: ValidationPlan; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [learnings, setLearnings] = useState(plan.learnings);
  const [checkLoading, setCheckLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const questions: string[] = JSON.parse(plan.interviewQuestions || "[]");
  const weeks: WeeklyStep[] = JSON.parse(plan.weeklySteps || "[]");
  const latestCheck = plan.realityChecks[0];

  async function saveStatus(status: string) {
    await fetch("/api/validation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: plan.id, status }),
    });
    onUpdate();
  }

  async function saveLearnings() {
    await fetch("/api/validation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: plan.id, learnings }),
    });
    setEditing(false);
    onUpdate();
  }

  async function runRealityCheck() {
    setCheckLoading(true);
    await fetch("/api/reality-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validationPlanId: plan.id }),
    });
    setCheckLoading(false);
    onUpdate();
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-sm text-foreground">{plan.problemCard.title}</p>
          <p className="text-xs text-muted mt-0.5">{plan.problemCard.who}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={plan.status} />
          <button onClick={() => setExpanded((v) => !v)} className="text-subtle hover:text-secondary">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <div className="bg-canvas border border-border rounded-lg p-3">
        <p className="text-xs text-muted mb-1">아이디어 초안</p>
        <p className="text-sm text-body">{plan.ideaDraft}</p>
      </div>

      {expanded && (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted mb-2">인터뷰 질문 ({questions.length}개)</p>
            <ol className="space-y-1.5">
              {questions.map((q, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-violet-600 shrink-0 font-medium">{i + 1}.</span>
                  <span className="text-body">{q}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-canvas border border-border rounded-lg p-3">
              <p className="text-xs text-muted mb-1">검증 방법</p>
              <p className="text-sm text-body">{plan.experimentMethod}</p>
            </div>
            <div className="grid grid-rows-2 gap-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
                <p className="text-xs text-green-700 mb-0.5 font-medium">성공 시그널</p>
                <p className="text-xs text-secondary">{plan.successSignals}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
                <p className="text-xs text-red-700 mb-0.5 font-medium">실패 시그널</p>
                <p className="text-xs text-secondary">{plan.failureSignals}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted mb-2">주차별 스텝</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {weeks.map((w) => (
                <div key={w.week} className="bg-canvas border border-border rounded-lg p-2.5">
                  <p className="text-xs text-violet-600 font-medium mb-1.5">{w.week}주차</p>
                  <ul className="space-y-1">
                    {w.actions.map((a, i) => (
                      <li key={i} className="text-xs text-secondary">• {a}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted">배운 것 / 인터뷰 기록</p>
              {!editing && (
                <button onClick={() => setEditing(true)} className="text-xs text-violet-600 hover:text-violet-500">편집</button>
              )}
            </div>
            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={learnings}
                  onChange={(e) => setLearnings(e.target.value)}
                  rows={4}
                  placeholder="인터뷰에서 배운 것, 가설 검증 결과..."
                  className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={saveLearnings} className="text-xs rounded-lg bg-violet-600 px-3 py-1.5 text-white hover:bg-violet-500">저장</button>
                  <button onClick={() => { setEditing(false); setLearnings(plan.learnings); }} className="text-xs rounded-lg border border-border px-3 py-1.5 text-secondary hover:bg-canvas">취소</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-tertiary bg-canvas border border-border rounded-lg p-3 min-h-[60px]">
                {plan.learnings || <span className="text-subtle">아직 기록된 내용이 없습니다</span>}
              </p>
            )}
          </div>

          {latestCheck && (
            <div className="border border-border rounded-xl p-4 space-y-3 bg-canvas">
              <p className="text-xs text-muted font-medium">최근 Reality Check</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { icon: Zap, label: "냉정한 투자자", content: latestCheck.coldInvestor, color: "text-red-600" },
                  { icon: AlertTriangle, label: "솔직한 친구", content: latestCheck.honestFriend, color: "text-amber-600" },
                  { icon: HelpCircle, label: "소크라테스", content: latestCheck.socraticQ, color: "text-blue-600" },
                ].map(({ icon: Icon, label, content, color }) => (
                  <div key={label} className="bg-surface border border-border rounded-lg p-3">
                    <div className={`flex items-center gap-1 mb-2 ${color}`}>
                      <Icon size={12} />
                      <p className="text-xs font-medium">{label}</p>
                    </div>
                    <p className="text-xs text-secondary whitespace-pre-wrap">{content}</p>
                  </div>
                ))}
              </div>
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                <div className="flex items-center gap-1 mb-1 text-violet-600">
                  <Scale size={12} />
                  <p className="text-xs font-medium">중재자 종합</p>
                </div>
                <p className="text-sm text-body">{latestCheck.moderatorSummary}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex gap-2">
              {plan.status !== "active" && (
                <button onClick={() => saveStatus("active")} className="text-xs rounded-lg bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 hover:bg-green-100 transition-colors">진행 중으로</button>
              )}
              {plan.status !== "completed" && (
                <button onClick={() => saveStatus("completed")} className="text-xs rounded-lg bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 hover:bg-blue-100 transition-colors">완료로</button>
              )}
            </div>
            <button
              onClick={runRealityCheck}
              disabled={checkLoading}
              className="flex items-center gap-1.5 text-xs rounded-lg bg-surface border border-border px-3 py-1.5 text-secondary hover:bg-canvas disabled:opacity-40 transition-colors"
            >
              {checkLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
              Reality Check
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function NewPlanModal({ onClose, onCreate }: { onClose: () => void; onCreate: (problemId: string) => void }) {
  const [problems, setProblems] = useState<ProblemCard[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    fetch("/api/problems").then((r) => r.json()).then(setProblems);
  }, []);

  const sorted = [...problems].sort((a, b) => (b.fitEvaluations[0]?.totalScore ?? 0) - (a.fitEvaluations[0]?.totalScore ?? 0));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-lg">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-sm text-foreground">검증 플랜 생성</h2>
          <p className="text-xs text-muted mt-0.5">문제를 선택하면 AI가 맞춤 플랜을 생성합니다</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sorted.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${selected === p.id ? "border-violet-500 bg-violet-50" : "border-border hover:bg-canvas"}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{p.title}</p>
                  {p.fitEvaluations[0] && (
                    <span className="text-xs text-violet-600 font-medium">Fit {p.fitEvaluations[0].totalScore.toFixed(1)}</span>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">{p.who}</p>
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 rounded-lg border border-border py-2.5 text-sm text-secondary hover:bg-canvas">취소</button>
            <button
              disabled={!selected}
              onClick={() => { onCreate(selected); onClose(); }}
              className="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
            >
              플랜 생성
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ValidationPage() {
  const [plans, setPlans] = useState<ValidationPlan[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchPlans = useCallback(async () => {
    const res = await fetch("/api/validation");
    setPlans(await res.json());
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  async function createPlan(problemCardId: string) {
    setCreating(true);
    await fetch("/api/validation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemCardId }),
    });
    await fetchPlans();
    setCreating(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={20} className="text-violet-600" />
          <h1 className="text-lg font-semibold text-foreground">Validation Backlog</h1>
          {creating && <Loader2 size={16} className="animate-spin text-violet-600" />}
        </div>
        <button
          onClick={() => setShowNew(true)}
          disabled={creating}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition-colors"
        >
          <Plus size={14} />
          새 검증 플랜
        </button>
      </div>

      {plans.length === 0 && !creating && (
        <div className="text-center py-16 text-subtle">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">아직 검증 플랜이 없습니다</p>
          <p className="text-xs mt-1">Fit 평가한 문제에서 플랜을 생성해보세요</p>
        </div>
      )}

      <div className="space-y-4">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onUpdate={fetchPlans} />
        ))}
      </div>

      {showNew && <NewPlanModal onClose={() => setShowNew(false)} onCreate={createPlan} />}
    </div>
  );
}
