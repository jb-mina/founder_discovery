"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Crosshair, Loader2, X, ExternalLink, Telescope, Star, Sparkles, ArrowRight, Trash2, Pencil } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
  fitEvaluations: { attraction: number; understanding: number; accessibility: number; motivation: number; totalScore: number; notes: string }[];
};

type Recommendation = { id: string; reason: string };

const SOURCE_LABELS: Record<string, string> = {
  yc: "YC", sequoia: "Sequoia", a16z: "a16z",
  producthunt: "Product Hunt", appstore: "App Store", manual: "직접 추가",
  news: "투자 뉴스",
};

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

function FitEvaluateModal({
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
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

type CardFormValues = {
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
};

function CardFormModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  initial?: ProblemCard;
  onClose: () => void;
  onSave: (data: CardFormValues) => void;
}) {
  const [form, setForm] = useState<CardFormValues>({
    title: initial?.title ?? "",
    who: initial?.who ?? "",
    when: initial?.when ?? "",
    why: initial?.why ?? "",
    painPoints: initial?.painPoints ?? "",
    alternatives: initial?.alternatives ?? "",
    source: initial?.source ?? "manual",
    sourceUrl: initial?.sourceUrl ?? "",
    tags: initial?.tags ?? "",
    stage: initial?.stage ?? "seed",
    category: initial?.category ?? "",
  });
  const set = (k: keyof CardFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const title = mode === "add" ? "문제 카드 추가" : "문제 카드 수정";
  const submitLabel = mode === "add" ? "저장" : "변경 저장";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-sm text-foreground">{title}</h2>
          <button onClick={onClose}><X size={16} className="text-subtle" /></button>
        </div>
        <div className="p-5 space-y-3">
          {([
            ["title", "문제 제목 *"],
            ["who", "누가 겪는가 *"],
            ["when", "언제 겪는가"],
            ["why", "왜 겪는가"],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <label className="text-xs text-muted mb-1 block">{label}</label>
              <input
                value={form[k]}
                onChange={set(k)}
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          ))}
          {([
            ["painPoints", "불편함 / 비용"],
            ["alternatives", "현재 대체재"],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <label className="text-xs text-muted mb-1 block">{label}</label>
              <textarea
                value={form[k]}
                onChange={set(k)}
                rows={2}
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-muted mb-1 block">출처 URL</label>
            <input
              type="url"
              value={form.sourceUrl}
              onChange={set("sourceUrl")}
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">카테고리</label>
              <input value={form.category} onChange={set("category")} className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">단계</label>
              <select
                value={form.stage}
                onChange={set("stage")}
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="seed">seed</option>
                <option value="series-a">series-a</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">태그 (콤마 구분)</label>
            <input value={form.tags} onChange={set("tags")} className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <button
            onClick={() => { if (form.title && form.who) { onSave(form); onClose(); } }}
            disabled={!form.title || !form.who}
            className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition-colors"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const SCOUT_SOURCES = [
  { id: "producthunt", label: "Product Hunt" },
  { id: "appstore", label: "App Store" },
  { id: "news", label: "투자 뉴스" },
];

const SCOUT_TOPICS = [
  "건강/헬스케어", "생산성", "교육", "반려동물", "재무/핀테크",
  "커리어", "식품/음식", "여행", "B2B/SaaS", "개발자도구",
  "멘탈헬스", "환경/지속가능성", "쇼핑", "엔터테인먼트",
];

function buildScoutQuery(sources: string[], topics: string[], context: string): string {
  const srcLabel = sources.map(s =>
    s === "producthunt" ? "Product Hunt" :
    s === "appstore" ? "App Store 앱스토어" : "투자 뉴스"
  ).join(", ");
  const topicStr = topics.length > 0 ? topics.join(", ") + " 관련 " : "";
  const ctxStr = context.trim() ? ` (맥락: ${context.trim()})` : "";
  return `${srcLabel}에서 ${topicStr}문제 5개${ctxStr}`;
}

function ScoutModal({ onClose, onImport }: { onClose: () => void; onImport: (cards: Partial<ProblemCard>[]) => void }) {
  const [sources, setSources] = useState<Set<string>>(new Set(["producthunt"]));
  const [topics, setTopics] = useState<Set<string>>(new Set());
  const [context, setContext] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const [parsed, setParsed] = useState<Partial<ProblemCard>[]>([]);
  const [parseError, setParseError] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggleSource(id: string) {
    setSources(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleTopic(t: string) {
    setTopics(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
  }

  const canRun = sources.size > 0 && !streaming;

  async function runScout() {
    if (!canRun) return;
    const query = buildScoutQuery([...sources], [...topics], context);
    setStreaming(true);
    setStage(null);
    setResult("");
    setParsed([]);
    setSelected(new Set());
    setParseError(false);
    const res = await fetch("/api/problems/scout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
      const stageMatches = text.match(/\|\|STAGE\|\|([^\n]+)/g);
      if (stageMatches?.length)
        setStage(stageMatches[stageMatches.length - 1].replace("||STAGE||", "").trim());
      setResult(text.replace(/\|\|STAGE\|\|[^\n]*\n?/g, ""));
    }
    setStage(null);
    setStreaming(false);
    const cleanText = text.replace(/\|\|STAGE\|\|[^\n]*\n?/g, "");
    try {
      const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const cards = JSON.parse(jsonMatch[0]);
        setParsed(cards);
        setSelected(new Set(cards.map((_: unknown, i: number) => i)));
      } else setParseError(true);
    } catch { setParseError(true); }
  }

  function toggleCard(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Telescope size={16} className="text-violet-600" />
            <h2 className="font-semibold text-sm text-foreground">Problem Scout Agent</h2>
          </div>
          <button onClick={onClose}><X size={16} className="text-subtle" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted">데이터 소스</p>
            <div className="flex gap-3">
              {SCOUT_SOURCES.map(s => (
                <label key={s.id} className={`flex items-center gap-2 cursor-pointer rounded-lg border px-4 py-2.5 text-sm transition-colors ${sources.has(s.id) ? "border-violet-400 bg-violet-50 text-violet-700" : "border-border text-secondary hover:bg-canvas"}`}>
                  <input type="checkbox" className="hidden" checked={sources.has(s.id)} onChange={() => toggleSource(s.id)} />
                  <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs font-bold shrink-0 ${sources.has(s.id) ? "bg-violet-600 border-violet-600 text-white" : "border-border-strong"}`}>
                    {sources.has(s.id) ? "✓" : ""}
                  </span>
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted">관심 분야 <span className="text-subtle font-normal">(복수 선택)</span></p>
            <div className="flex flex-wrap gap-2">
              {SCOUT_TOPICS.map(t => (
                <button
                  key={t}
                  onClick={() => toggleTopic(t)}
                  className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${topics.has(t) ? "bg-violet-600 border-violet-600 text-white" : "bg-wash border-transparent hover:bg-neutral-200 text-tertiary"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted">맥락 <span className="text-subtle font-normal">(선택)</span></p>
            <input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runScout(); }}
              placeholder='예: "1인 창업자", "번아웃", "루틴 관리"'
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <button
            onClick={runScout}
            disabled={!canRun}
            className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
          >
            {streaming ? <><Loader2 size={14} className="animate-spin" />탐색 중...</> : "탐색"}
          </button>
          {streaming && (
            <div className="flex items-center gap-2 text-xs text-violet-600 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2.5">
              <Loader2 size={12} className="animate-spin shrink-0" />
              <span>{stage ?? "탐색 준비 중..."}</span>
            </div>
          )}
          {streaming && result && (
            <div className="text-xs text-muted bg-canvas border border-border rounded-lg p-3 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
              {result}
            </div>
          )}
          {parseError && !streaming && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              응답 파싱에 실패했습니다. 다시 시도해주세요.
            </div>
          )}
          {parsed.length > 0 && !streaming && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted">{parsed.length}개 문제 발견 — 가져올 카드를 선택하세요</p>
                <button
                  onClick={() => setSelected(selected.size === parsed.length ? new Set() : new Set(parsed.map((_, i) => i)))}
                  className="text-xs text-violet-600 hover:text-violet-500"
                >
                  {selected.size === parsed.length ? "전체 해제" : "전체 선택"}
                </button>
              </div>
              {parsed.map((card, i) => (
                <button
                  key={i}
                  onClick={() => toggleCard(i)}
                  className={`w-full text-left rounded-lg border p-4 space-y-1 transition-colors ${
                    selected.has(i) ? "border-violet-400 bg-violet-50" : "border-border bg-canvas opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center text-xs font-bold transition-colors ${
                      selected.has(i) ? "bg-violet-600 border-violet-600 text-white" : "border-border-strong"
                    }`}>
                      {selected.has(i) ? "✓" : ""}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{card.title}</p>
                      <p className="text-xs text-tertiary">{card.who}</p>
                      <p className="text-xs text-muted">{card.painPoints}</p>
                    </div>
                  </div>
                </button>
              ))}
              <button
                disabled={selected.size === 0}
                onClick={() => { onImport(parsed.filter((_, i) => selected.has(i))); onClose(); }}
                className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition-colors"
              >
                선택 항목 가져오기 ({selected.size}개)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailPanel({
  card,
  onClose,
  onEvaluate,
  onEdit,
  onDelete,
}: {
  card: ProblemCard;
  onClose: () => void;
  onEvaluate: (card: ProblemCard) => void;
  onEdit: (card: ProblemCard) => void;
  onDelete: (id: string) => void;
}) {
  const isEvaluated = card.fitEvaluations.length > 0;
  function handleDelete() {
    if (window.confirm("이 문제 카드를 삭제하시겠습니까?\n관련 Fit 평가·검증 데이터도 함께 삭제됩니다.")) {
      onDelete(card.id);
    }
  }
  const fields = [
    { label: "누가 겪는가", value: card.who },
    { label: "언제 겪는가", value: card.when },
    { label: "왜 겪는가", value: card.why },
    { label: "불편함 & 비용", value: card.painPoints },
    { label: "현재 대체재", value: card.alternatives },
  ].filter((f) => f.value);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full md:max-w-md bg-surface border-l border-border shadow-xl z-50 flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="space-y-2 pr-4">
            <h2 className="font-semibold text-sm text-foreground leading-snug">{card.title}</h2>
            <div className="flex flex-wrap gap-1">
              {card.source !== "manual" && (
                <Badge variant="blue">{SOURCE_LABELS[card.source] ?? card.source}</Badge>
              )}
              {card.stage && <Badge variant="amber">{card.stage}</Badge>}
              {card.category && <Badge variant="default">{card.category}</Badge>}
              {card.fitEvaluations.length > 0 && (
                <span className="text-xs font-semibold text-violet-700 bg-violet-100 border border-violet-200 rounded-full px-2 py-0.5">
                  Fit {card.fitEvaluations[0].totalScore.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <button
              onClick={() => onEdit(card)}
              aria-label="문제 수정"
              title="문제 수정"
              className="text-subtle hover:text-violet-600 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              aria-label="문제 삭제"
              title="문제 삭제"
              className="text-subtle hover:text-red-600 transition-colors"
            >
              <Trash2 size={14} />
            </button>
            <button onClick={onClose} className="text-subtle hover:text-secondary">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-xs font-medium text-muted mb-1">{f.label}</p>
              <p className="text-sm text-body leading-relaxed">{f.value}</p>
            </div>
          ))}

          {card.tags && (
            <div>
              <p className="text-xs font-medium text-muted mb-1.5">태그</p>
              <div className="flex flex-wrap gap-1.5">
                {card.tags.split(",").filter(Boolean).map((t) => (
                  <span key={t} className="text-xs bg-wash text-tertiary rounded px-2 py-1">
                    {t.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {card.sourceUrl && (
            <a
              href={card.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-500"
            >
              <ExternalLink size={13} />
              출처 보기
            </a>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border shrink-0 space-y-2">
          <button
            onClick={() => { onEvaluate(card); onClose(); }}
            className="flex items-center justify-center w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
          >
            {isEvaluated ? (
              <><Star size={14} className="mr-1.5 fill-white" />Fit 재평가하기</>
            ) : "Fit 평가하기"}
          </button>
          <Link
            href={`/validation/${card.id}`}
            className="flex items-center justify-center w-full rounded-lg border border-violet-200 bg-violet-50 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors"
          >
            검증 시작 <ArrowRight size={14} className="ml-1" />
          </Link>
        </div>
      </div>
    </>
  );
}

export default function ProblemsPage() {
  const [cards, setCards] = useState<ProblemCard[]>([]);
  const [q, setQ] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterEvaluated, setFilterEvaluated] = useState<"all" | "unevaluated" | "evaluated">("all");
  const [sortBy, setSortBy] = useState<"recent" | "fit">("recent");
  const [showAdd, setShowAdd] = useState(false);
  const [showScout, setShowScout] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ProblemCard | null>(null);
  const [evaluatingCard, setEvaluatingCard] = useState<ProblemCard | null>(null);
  const [editingCard, setEditingCard] = useState<ProblemCard | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

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

  async function updateCard(id: string, data: Partial<ProblemCard>) {
    await fetch(`/api/problems/${id}`, {
      method: "PATCH",
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

  async function saveFitEvaluation(problemId: string, data: { attraction: number; understanding: number; accessibility: number; motivation: number; notes: string }) {
    await fetch("/api/fit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemCardId: problemId, ...data }),
    });
    setRecommendations((rec) => rec.filter((r) => r.id !== problemId));
    await fetchCards();
  }

  async function deleteCard(id: string) {
    await fetch("/api/problems", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSelectedCard(null);
    setRecommendations((rec) => rec.filter((r) => r.id !== id));
    await fetchCards();
  }

  async function getRecommendations() {
    setLoadingRecs(true);
    try {
      const res = await fetch("/api/fit", { method: "PUT" });
      const data = await res.json();
      setRecommendations(data.recommendations ?? []);
    } finally {
      setLoadingRecs(false);
    }
  }

  const uniqueSources = [...new Set(cards.map(c => c.source).filter(Boolean))];
  const uniqueStages = [...new Set(cards.map(c => c.stage).filter(Boolean))];
  const uniqueCategories = [...new Set(cards.map(c => c.category).filter(Boolean))];

  const filtered = cards
    .filter(c => !filterSource || c.source === filterSource)
    .filter(c => !filterStage || c.stage === filterStage)
    .filter(c => !filterCategory || c.category === filterCategory)
    .filter(c =>
      filterEvaluated === "all" ? true :
      filterEvaluated === "evaluated" ? c.fitEvaluations.length > 0 :
      c.fitEvaluations.length === 0
    )
    .sort((a, b) => {
      if (sortBy === "fit") {
        return (b.fitEvaluations[0]?.totalScore ?? -1) - (a.fitEvaluations[0]?.totalScore ?? -1);
      }
      return 0;
    });

  const hasActiveFilters = filterSource || filterStage || filterCategory || filterEvaluated !== "all";
  const recIds = new Set(recommendations.map((r) => r.id));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair size={20} className="text-violet-600" />
          <h1 className="text-lg font-semibold text-foreground">Problem Universe</h1>
          <span className="text-sm text-muted">{cards.length}개 문제 카드</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowScout(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-secondary hover:bg-wash transition-colors"
          >
            <Telescope size={14} />
            Scout
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-secondary hover:bg-wash transition-colors"
          >
            <Plus size={14} />
            직접 추가
          </button>
          <button
            onClick={getRecommendations}
            disabled={loadingRecs}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 transition-colors"
          >
            {loadingRecs ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Fit Judge 추천받기
          </button>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-secondary flex items-center gap-1.5">
            <Sparkles size={14} className="text-violet-600" />
            Fit Judge 추천 ({recommendations.filter((r) => cards.find((c) => c.id === r.id)).length}개)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec) => {
              const card = cards.find((c) => c.id === rec.id);
              if (!card) return null;
              return (
                <Card
                  key={rec.id}
                  className="border-violet-200 bg-violet-50 cursor-pointer hover:border-violet-300 transition-colors"
                  onClick={() => setSelectedCard(card)}
                >
                  <CardHeader>
                    <CardTitle className="text-sm">{card.title}</CardTitle>
                  </CardHeader>
                  <p className="text-xs text-violet-700 mb-3">{rec.reason}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEvaluatingCard(card); }}
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

      <div className="space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="문제 검색..."
            className="w-full max-w-sm rounded-lg border border-border bg-surface pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">소스 전체</option>
            {uniqueSources.map(s => <option key={s} value={s}>{SOURCE_LABELS[s] ?? s}</option>)}
          </select>
          <select
            value={filterStage}
            onChange={e => setFilterStage(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">단계 전체</option>
            {uniqueStages.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">카테고리 전체</option>
            {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterEvaluated}
            onChange={e => setFilterEvaluated(e.target.value as "all" | "unevaluated" | "evaluated")}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">평가 전체</option>
            <option value="unevaluated">미평가</option>
            <option value="evaluated">평가 완료</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as "recent" | "fit")}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="recent">최신순</option>
            <option value="fit">Fit 점수순</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => { setFilterSource(""); setFilterStage(""); setFilterCategory(""); setFilterEvaluated("all"); }}
              className="text-xs text-muted hover:text-secondary px-2 py-2"
            >
              초기화
            </button>
          )}
          {hasActiveFilters && (
            <span className="text-xs text-muted">{filtered.length}개 표시</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((card) => (
          <Card key={card.id} className="flex flex-col gap-3 hover:border-border-strong transition-colors cursor-pointer" onClick={() => setSelectedCard(card)}>
            <CardHeader className="mb-0">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm leading-snug">{card.title}</CardTitle>
                {card.fitEvaluations.length > 0 && (
                  <span className="shrink-0 text-xs font-semibold text-violet-700 bg-violet-100 border border-violet-200 rounded-full px-2 py-0.5">
                    Fit {card.fitEvaluations[0].totalScore.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {recIds.has(card.id) && (
                  <span className="text-xs bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">추천</span>
                )}
                {card.source !== "manual" && (
                  <Badge variant="blue">{SOURCE_LABELS[card.source] ?? card.source}</Badge>
                )}
                {card.stage && <Badge variant="amber">{card.stage}</Badge>}
                {card.category && <Badge variant="default">{card.category}</Badge>}
              </div>
            </CardHeader>

            <div className="space-y-2 text-xs text-body">
              <div><span className="text-muted mr-1">대상</span>{card.who}</div>
              <div><span className="text-muted mr-1">불편함</span>{card.painPoints}</div>
              <div><span className="text-muted mr-1">대체재</span>{card.alternatives}</div>
            </div>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
              <div className="flex flex-wrap gap-1">
                {card.tags.split(",").filter(Boolean).map((t) => (
                  <span key={t} className="text-xs bg-wash text-tertiary rounded px-1.5 py-0.5">{t.trim()}</span>
                ))}
              </div>
              {card.sourceUrl && (
                <a href={card.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-subtle hover:text-tertiary" onClick={(e) => e.stopPropagation()}>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>

      {showAdd && <CardFormModal mode="add" onClose={() => setShowAdd(false)} onSave={saveCard} />}
      {showScout && <ScoutModal onClose={() => setShowScout(false)} onImport={importCards} />}
      {selectedCard && (() => {
        const fresh = cards.find((c) => c.id === selectedCard.id) ?? selectedCard;
        return (
          <DetailPanel
            card={fresh}
            onClose={() => setSelectedCard(null)}
            onEvaluate={(card) => setEvaluatingCard(card)}
            onEdit={(card) => setEditingCard(card)}
            onDelete={deleteCard}
          />
        );
      })()}
      {editingCard && (
        <CardFormModal
          mode="edit"
          initial={editingCard}
          onClose={() => setEditingCard(null)}
          onSave={(data) => updateCard(editingCard.id, data)}
        />
      )}
      {evaluatingCard && (
        <FitEvaluateModal
          existing={evaluatingCard.fitEvaluations[0]}
          card={evaluatingCard}
          onClose={() => setEvaluatingCard(null)}
          onSave={(data) => saveFitEvaluation(evaluatingCard.id, data)}
        />
      )}
    </div>
  );
}
