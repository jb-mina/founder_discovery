"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertCircle, Sparkles, Loader2, Star } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ProblemCard = {
  id: string;
  title: string;
  who: string;
  painPoints: string;
  tags: string;
  category: string;
  fitEvaluations: { attraction: number; understanding: number; accessibility: number; motivation: number; totalScore: number; notes: string }[];
};

type Recommendation = { id: string; reason: string };

function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-tertiary">{label}</span>
        <span className="font-semibold text-violet-600">{value}/5</span>
      </div>
      <input
        type="range" min={1} max={5} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-violet-500"
      />
    </div>
  );
}

function EvaluateModal({
  card,
  existing,
  onClose,
  onSave,
}: {
  card: ProblemCard;
  existing?: ProblemCard["fitEvaluations"][0];
  onClose: () => void;
  onSave: (data: { attraction: number; understanding: number; accessibility: number; motivation: number; notes: string }) => void;
}) {
  const [attraction, setAttraction] = useState(existing?.attraction ?? 3);
  const [understanding, setUnderstanding] = useState(existing?.understanding ?? 3);
  const [accessibility, setAccessibility] = useState(existing?.accessibility ?? 3);
  const [motivation, setMotivation] = useState(existing?.motivation ?? 3);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const avg = ((attraction + understanding + accessibility + motivation) / 4).toFixed(1);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-md">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-sm text-foreground">Fit 평가</h2>
          <p className="text-xs text-muted mt-0.5">{card.title}</p>
        </div>
        <div className="p-5 space-y-4">
          <ScoreSlider label="끌림 — 이 문제가 얼마나 끌리는가?" value={attraction} onChange={setAttraction} />
          <ScoreSlider label="이해도 — 이 문제를 얼마나 잘 아는가?" value={understanding} onChange={setUnderstanding} />
          <ScoreSlider label="접근성 — 고객에게 접근 가능한가?" value={accessibility} onChange={setAccessibility} />
          <ScoreSlider label="장기 동기 — 3년 뒤에도 이 문제를 풀고 싶을까?" value={motivation} onChange={setMotivation} />
          <div>
            <label className="text-xs text-muted mb-1 block">메모 (선택)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="이 문제에 대해 느끼는 것, 아는 것..."
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-secondary">
              평균 Fit 점수: <span className="text-violet-600 font-bold text-xl">{avg}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-secondary hover:bg-canvas">취소</button>
              <button
                onClick={() => { onSave({ attraction, understanding, accessibility, motivation, notes }); onClose(); }}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FitPage() {
  const [problems, setProblems] = useState<ProblemCard[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [evaluating, setEvaluating] = useState<ProblemCard | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const fetchProblems = useCallback(async () => {
    const res = await fetch("/api/problems");
    setProblems(await res.json());
  }, []);

  useEffect(() => { fetchProblems(); }, [fetchProblems]);

  async function getRecommendations() {
    setLoadingRecs(true);
    const res = await fetch("/api/fit", { method: "PUT" });
    const data = await res.json();
    setRecommendations(data.recommendations);
    setLoadingRecs(false);
  }

  async function saveEvaluation(problemId: string, data: { attraction: number; understanding: number; accessibility: number; motivation: number; notes: string }) {
    await fetch("/api/fit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemCardId: problemId, ...data }),
    });
    await fetchProblems();
  }

  const evaluated = problems.filter((p) => p.fitEvaluations.length > 0);
  const unevaluated = problems.filter((p) => p.fitEvaluations.length === 0);
  const recIds = new Set(recommendations.map((r) => r.id));
  const recommended = problems.filter((p) => recIds.has(p.id));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle size={20} className="text-violet-600" />
          <h1 className="text-lg font-semibold text-foreground">Founder-Problem Fit</h1>
        </div>
        <button
          onClick={getRecommendations}
          disabled={loadingRecs}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition-colors"
        >
          {loadingRecs ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Fit Judge 추천받기
        </button>
      </div>

      {recommendations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-secondary flex items-center gap-1.5">
            <Sparkles size={14} className="text-violet-600" />
            Fit Judge 추천 ({recommended.length}개)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec) => {
              const card = problems.find((p) => p.id === rec.id);
              if (!card) return null;
              return (
                <Card key={rec.id} className="border-violet-200 bg-violet-50">
                  <CardHeader>
                    <CardTitle className="text-sm">{card.title}</CardTitle>
                  </CardHeader>
                  <p className="text-xs text-violet-700 mb-3">{rec.reason}</p>
                  <button
                    onClick={() => setEvaluating(card)}
                    className="text-xs rounded-lg bg-violet-100 hover:bg-violet-200 border border-violet-200 px-3 py-1.5 text-violet-700 transition-colors"
                  >
                    평가하기
                  </button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {evaluated.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-secondary">평가 완료 — 내 우선순위 문제</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {evaluated
              .sort((a, b) => (b.fitEvaluations[0]?.totalScore ?? 0) - (a.fitEvaluations[0]?.totalScore ?? 0))
              .map((card) => {
                const e = card.fitEvaluations[0];
                return (
                  <Card key={card.id} className="hover:border-border-strong transition-colors cursor-pointer" onClick={() => setEvaluating(card)}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium leading-snug text-foreground">{card.title}</p>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Star size={12} className="text-amber-500 fill-amber-500" />
                        <span className="text-sm font-bold text-amber-600">{e.totalScore.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mt-3">
                      {[["끌림", e.attraction], ["이해", e.understanding], ["접근", e.accessibility], ["동기", e.motivation]].map(([l, v]) => (
                        <div key={l} className="text-center">
                          <div className="text-xs text-muted">{l}</div>
                          <div className="text-sm font-semibold text-violet-600">{v}</div>
                        </div>
                      ))}
                    </div>
                    {e.notes && <p className="text-xs text-muted mt-2">{e.notes}</p>}
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted">미평가 문제 ({unevaluated.length}개)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {unevaluated.map((card) => (
            <Card key={card.id} className="cursor-pointer hover:border-border-strong transition-colors" onClick={() => setEvaluating(card)}>
              <p className="text-sm font-medium mb-1 text-foreground">{card.title}</p>
              <p className="text-xs text-muted mb-2">{card.who}</p>
              <div className="flex flex-wrap gap-1">
                {card.tags.split(",").filter(Boolean).map((t) => (
                  <Badge key={t} variant="default">{t.trim()}</Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {evaluating && (
        <EvaluateModal
          card={evaluating}
          existing={evaluating.fitEvaluations[0]}
          onClose={() => setEvaluating(null)}
          onSave={(data) => saveEvaluation(evaluating.id, data)}
        />
      )}
    </div>
  );
}
