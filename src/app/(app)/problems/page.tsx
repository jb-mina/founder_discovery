"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Crosshair, Loader2, X, ExternalLink, Telescope } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ProblemCard = {
  id: string;
  title: string;
  who: string;
  when: string;
  why: string;
  painPoints: string;
  alternatives: string;
  source: string;
  sourceUrl: string;
  tags: string;
  stage: string;
  category: string;
  fitEvaluations: { totalScore: number }[];
};

const SOURCE_LABELS: Record<string, string> = {
  yc: "YC", sequoia: "Sequoia", a16z: "a16z",
  producthunt: "Product Hunt", appstore: "App Store", manual: "직접 추가",
};

const SCOUT_PRESETS = [
  "YC W2026 배치 중 Healthcare, Consumer 카테고리 흥미로운 문제 5개",
  "Sequoia 포트폴리오 중 Productivity, B2B SaaS 문제 5개",
  "한국 스타트업 생태계에서 Seed 단계로 풀고 있는 문제 5개",
  "Product Hunt 최근 트렌드에서 발견되는 반복 문제 5개",
];

function AddCardModal({ onClose, onSave }: { onClose: () => void; onSave: (data: Partial<ProblemCard>) => void }) {
  const [form, setForm] = useState({
    title: "", who: "", when: "", why: "", painPoints: "",
    alternatives: "", source: "manual", sourceUrl: "", tags: "", stage: "seed", category: "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h2 className="font-semibold text-sm">문제 카드 추가</h2>
          <button onClick={onClose}><X size={16} className="text-neutral-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          {[
            ["title", "문제 제목 *", "text"],
            ["who", "누가 겪는가 *", "text"],
            ["when", "언제 겪는가", "text"],
            ["why", "왜 겪는가", "text"],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="text-xs text-neutral-400 mb-1 block">{label}</label>
              <input
                value={(form as Record<string, string>)[k]}
                onChange={set(k)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          ))}
          {[
            ["painPoints", "불편함 / 비용"],
            ["alternatives", "현재 대체재"],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="text-xs text-neutral-400 mb-1 block">{label}</label>
              <textarea
                value={(form as Record<string, string>)[k]}
                onChange={set(k)}
                rows={2}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">카테고리</label>
              <input value={form.category} onChange={set("category")} className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">태그 (콤마 구분)</label>
              <input value={form.tags} onChange={set("tags")} className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          <button
            onClick={() => { if (form.title && form.who) { onSave(form); onClose(); } }}
            disabled={!form.title || !form.who}
            className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-40 transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoutModal({ onClose, onImport }: { onClose: () => void; onImport: (cards: Partial<ProblemCard>[]) => void }) {
  const [query, setQuery] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [result, setResult] = useState("");
  const [parsed, setParsed] = useState<Partial<ProblemCard>[]>([]);

  async function scout(q: string) {
    setQuery(q);
    setStreaming(true);
    setResult("");
    setParsed([]);
    const res = await fetch("/api/problems/scout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
      setResult(text);
    }
    setStreaming(false);
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) setParsed(JSON.parse(jsonMatch[0]));
    } catch {}
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Telescope size={16} className="text-violet-400" />
            <h2 className="font-semibold text-sm">Problem Scout Agent</h2>
          </div>
          <button onClick={onClose}><X size={16} className="text-neutral-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) scout(query); }}
              placeholder="스카우트 요청 입력..."
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              onClick={() => scout(query)}
              disabled={streaming || !query.trim()}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500 disabled:opacity-40"
            >
              {streaming ? <Loader2 size={16} className="animate-spin" /> : "탐색"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {SCOUT_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => scout(p)}
                className="text-xs bg-neutral-800 hover:bg-neutral-700 rounded-full px-3 py-1.5 text-neutral-300 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
          {streaming && (
            <div className="text-xs text-neutral-500 bg-neutral-800 rounded-lg p-3 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
              {result || "탐색 중..."}
            </div>
          )}
          {parsed.length > 0 && !streaming && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-400">{parsed.length}개 문제 발견 — 가져올 카드를 선택하세요</p>
              {parsed.map((card, i) => (
                <div key={i} className="border border-neutral-700 rounded-lg p-4 space-y-1">
                  <p className="text-sm font-medium">{card.title}</p>
                  <p className="text-xs text-neutral-400">{card.who}</p>
                  <p className="text-xs text-neutral-500">{card.painPoints}</p>
                </div>
              ))}
              <button
                onClick={() => { onImport(parsed); onClose(); }}
                className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium hover:bg-violet-500"
              >
                전체 가져오기 ({parsed.length}개)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProblemsPage() {
  const [cards, setCards] = useState<ProblemCard[]>([]);
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showScout, setShowScout] = useState(false);

  const fetchCards = useCallback(async () => {
    const res = await fetch(`/api/problems${q ? `?q=${q}` : ""}`);
    setCards(await res.json());
  }, [q]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  useEffect(() => {
    fetch("/api/problems/seed", { method: "POST" }).then(() => fetchCards());
  }, [fetchCards]);

  async function saveCard(data: Partial<ProblemCard>) {
    await fetch("/api/problems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await fetchCards();
  }

  async function importCards(data: Partial<ProblemCard>[]) {
    for (const card of data) {
      await fetch("/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...card, addedBy: "scout" }),
      });
    }
    await fetchCards();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair size={20} className="text-violet-400" />
          <h1 className="text-lg font-semibold">Problem Universe</h1>
          <span className="text-sm text-neutral-500">{cards.length}개 문제 카드</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowScout(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 transition-colors"
          >
            <Telescope size={14} />
            Scout
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium hover:bg-violet-500 transition-colors"
          >
            <Plus size={14} />
            직접 추가
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="문제 검색..."
          className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-900 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.id} className="flex flex-col gap-3 hover:border-neutral-600 transition-colors">
            <CardHeader className="mb-0">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm leading-snug">{card.title}</CardTitle>
                {card.fitEvaluations.length > 0 && (
                  <span className="shrink-0 text-xs font-semibold text-violet-300 bg-violet-900/50 rounded-full px-2 py-0.5">
                    Fit {card.fitEvaluations[0].totalScore.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {card.source !== "manual" && (
                  <Badge variant="blue">{SOURCE_LABELS[card.source] ?? card.source}</Badge>
                )}
                {card.stage && <Badge variant="amber">{card.stage}</Badge>}
                {card.category && <Badge variant="default">{card.category}</Badge>}
              </div>
            </CardHeader>

            <div className="space-y-2 text-xs text-neutral-400">
              <div><span className="text-neutral-500">대상</span> {card.who}</div>
              <div><span className="text-neutral-500">불편함</span> {card.painPoints}</div>
              <div><span className="text-neutral-500">대체재</span> {card.alternatives}</div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-neutral-800">
              <div className="flex flex-wrap gap-1">
                {card.tags.split(",").filter(Boolean).map((t) => (
                  <span key={t} className="text-xs bg-neutral-800 text-neutral-400 rounded px-1.5 py-0.5">{t.trim()}</span>
                ))}
              </div>
              {card.sourceUrl && (
                <a href={card.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-neutral-300">
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>

      {showAdd && <AddCardModal onClose={() => setShowAdd(false)} onSave={saveCard} />}
      {showScout && <ScoutModal onClose={() => setShowScout(false)} onImport={importCards} />}
    </div>
  );
}
