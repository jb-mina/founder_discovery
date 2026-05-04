"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Trash2, Brain, RefreshCw, Pencil, X, Loader2, MessageSquare, Network, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FounderIdentityCard,
  type Synthesis,
  type SynthesisState,
} from "./_components/FounderIdentityCard";
import { TensionGapSide } from "./_components/TensionGapSide";
import { NodeMap } from "./_components/NodeMap";
import { TagCloud } from "./_components/TagCloud";

type Message = { role: "user" | "assistant"; content: string };
type SelfMapEntry = {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string;
};

type Mode = "thread" | "gap" | "tension" | "energy";
type PageMode = "interview" | "canvas";

type OpeningResponse = {
  interviewSessionId: string;
  conversationSessionId: string;
  mode: Mode;
  modeContext: { targetCategory?: string };
  firstMessage: string;
  modeHintLine?: string;
};

const CATEGORY_LABELS: Record<string, { label: string; color: "violet" | "green" | "amber" | "blue" | "red" }> = {
  interests: { label: "관심사", color: "violet" },
  strengths: { label: "강점", color: "green" },
  aversions: { label: "혐오", color: "red" },
  flow: { label: "몰입 경험", color: "amber" },
  network: { label: "네트워크", color: "blue" },
  other: { label: "기타", color: "violet" },
};

const CATEGORY_OPTIONS = ["interests", "strengths", "aversions", "flow", "network", "other"];

export default function SelfMapPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [entries, setEntries] = useState<SelfMapEntry[]>([]);
  const [started, setStarted] = useState(false);
  const [opening, setOpening] = useState(false);
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null);
  // Client-only deep-dive topic hint passed to the Self Insight agent each
  // turn. Resets when a new session starts so it stays session-scoped.
  const [deepDiveTopic, setDeepDiveTopic] = useState("");
  const [editingTopic, setEditingTopic] = useState(false);
  const [topicDraft, setTopicDraft] = useState("");
  const [conversationSessionId, setConversationSessionId] = useState<string | null>(null);
  const [modeHintLine, setModeHintLine] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SelfMapEntry | null>(null);
  const [editForm, setEditForm] = useState({ category: "", question: "", answer: "", tags: "" });
  const [pageMode, setPageMode] = useState<PageMode>("interview");

  // "이번 대화에서" 새 항목 도트용 baseline.
  // 페이지 mount 시 첫 fetchEntries에서 한 번만 set되고 새로고침 시 초기화 → fresh가 빈 셋 (의도).
  const [baselineIds, setBaselineIds] = useState<Set<string>>(new Set());
  const [, setBaselineSet] = useState(false);

  // Synthesis state는 page에서 관리 — 두 컴포넌트(Identity / TensionGap)가
  // 같은 데이터를 공유하므로 fetch를 중복하지 않게.
  const [synthesisState, setSynthesisState] = useState<SynthesisState>({ status: "loading" });
  const [refreshingSynthesis, setRefreshingSynthesis] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/api/self-map");
    const list = (await res.json()) as SelfMapEntry[];
    setEntries(list);
    setBaselineSet((prev) => {
      if (prev) return prev;
      setBaselineIds(new Set(list.map((e) => e.id)));
      return true;
    });
  }, []);

  // GET은 cache-only — LLM 호출은 사용자 trigger ("요약보기" 버튼)에서만 일어남.
  // cache_miss + previousSynthesis 있으면 옛 카드를 outdated 배지와 함께 보여주고,
  // previousSynthesis 없으면 placeholder + 상단 trigger 안내.
  const loadSynthesis = useCallback(async () => {
    try {
      const res = await fetch("/api/self-map/synthesis");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = await res.json();
      if (json.ready) {
        setSynthesisState({ status: "ready", synthesis: json.synthesis as Synthesis, outdated: false });
        return;
      }
      if (json.reason === "not_enough_entries") {
        setSynthesisState({ status: "not_ready", entryCount: json.entryCount, threshold: json.threshold });
        return;
      }
      if (json.reason === "cache_miss") {
        if (json.previousSynthesis) {
          setSynthesisState({ status: "ready", synthesis: json.previousSynthesis as Synthesis, outdated: true });
        } else {
          setSynthesisState({ status: "cache_miss" });
        }
        return;
      }
      setSynthesisState({ status: "error", message: "unexpected response" });
    } catch (e) {
      setSynthesisState({ status: "error", message: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEntries();
    loadSynthesis();
  }, [fetchEntries, loadSynthesis]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function openEdit(entry: SelfMapEntry) {
    setEditingEntry(entry);
    setEditForm({ category: entry.category, question: entry.question, answer: entry.answer, tags: entry.tags });
  }

  async function saveEdit() {
    if (!editingEntry) return;
    await fetch("/api/self-map", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingEntry.id, ...editForm }),
    });
    await fetchEntries();
    setEditingEntry(null);
  }

  async function sendMessage(content: string) {
    if (!conversationSessionId) return;
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    const res = await fetch("/api/self-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: newMessages,
        sessionId: conversationSessionId,
        deepDiveTopic: deepDiveTopic.trim() || undefined,
      }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assistantText += decoder.decode(value);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: assistantText };
        return next;
      });
    }

    setStreaming(false);

    const finalMessages = [...newMessages, { role: "assistant" as const, content: assistantText }];
    fetch("/api/self-insight/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: finalMessages.slice(-6), sessionId: conversationSessionId }),
    })
      .then(async (r) => {
        if (r.ok && r.status === 201) {
          await fetchEntries();
          await loadSynthesis();
        }
      })
      .catch(() => {});

    inputRef.current?.focus();
  }

  async function startSession(force?: { mode?: Mode; category?: string }) {
    if (opening) return;
    setOpening(true);
    try {
      const res = await fetch("/api/self-insight/opening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(force ?? {}),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as OpeningResponse;
      setInterviewSessionId(data.interviewSessionId);
      setConversationSessionId(data.conversationSessionId);
      setModeHintLine(data.modeHintLine ?? null);
      setMessages([{ role: "assistant", content: data.firstMessage }]);
      setStarted(true);
      setPageMode("interview");
      // Topic hint is session-scoped — clear when a new session starts
      // so a previous deep-dive doesn't leak into the next one.
      setDeepDiveTopic("");
      setEditingTopic(false);
      setTopicDraft("");
    } catch (e) {
      alert(`인터뷰 시작 실패: ${(e as Error).message}`);
    } finally {
      setOpening(false);
    }
  }

  async function endSession() {
    if (!interviewSessionId || ending) return;
    if (!window.confirm("이번 인터뷰를 마칠까요? 다음에 이어가는 모드로 다시 시작돼요.")) return;
    setEnding(true);
    try {
      const res = await fetch(`/api/interview-session/${interviewSessionId}/end`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      await loadSynthesis();
      setStarted(false);
      setMessages([]);
      setInterviewSessionId(null);
      setConversationSessionId(null);
      setModeHintLine(null);
    } catch (e) {
      alert(`저장 실패: ${(e as Error).message}`);
    } finally {
      setEnding(false);
    }
  }

  async function refreshSynthesis() {
    if (refreshingSynthesis) return;
    setRefreshingSynthesis(true);
    try {
      const res = await fetch("/api/self-map/synthesis/refresh", { method: "POST" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = await res.json();
      if (!json.ready) {
        setSynthesisState({ status: "not_ready", entryCount: json.entryCount, threshold: json.threshold });
      } else {
        setSynthesisState({ status: "ready", synthesis: json.synthesis as Synthesis, outdated: false });
      }
    } catch (e) {
      setSynthesisState({ status: "error", message: (e as Error).message });
    } finally {
      setRefreshingSynthesis(false);
    }
  }

  async function patchSynthesisStatement(id: string, value: string | null) {
    const res = await fetch("/api/self-map/synthesis", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, userEditedStatement: value }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = await res.json();
    setSynthesisState({ status: "ready", synthesis: json.synthesis as Synthesis, outdated: false });
  }

  async function dismissTension(key: string) {
    if (synthesisState.status !== "ready") return;
    const res = await fetch("/api/self-map/synthesis", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: synthesisState.synthesis.id, dismissTensionKey: key }),
    });
    if (!res.ok) return;
    const json = await res.json();
    setSynthesisState({ status: "ready", synthesis: json.synthesis as Synthesis, outdated: false });
  }

  function scrollToEntry(entryId: string) {
    setPageMode("interview");
    // Wait for DOM to flip into interview mode (sidebar is rendered then).
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-entry-id="${entryId}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-violet-500");
      setTimeout(() => el.classList.remove("ring-2", "ring-violet-500"), 1500);
    }, 80);
  }

  async function startGapInterview(category: string) {
    if (started && !window.confirm("현재 인터뷰를 끝내고 새로 시작할까요?")) return;
    if (started && interviewSessionId) {
      // End the current one silently — best effort, no metadata regen.
      await fetch(`/api/interview-session/${interviewSessionId}/end`, { method: "POST" }).catch(() => {});
      setMessages([]);
      setInterviewSessionId(null);
      setConversationSessionId(null);
    }
    await startSession({ mode: "gap", category });
  }

  async function deleteEntry(id: string) {
    await fetch("/api/self-map", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchEntries();
    await loadSynthesis();
  }

  const grouped = entries.reduce<Record<string, SelfMapEntry[]>>((acc, e) => {
    (acc[e.category] ??= []).push(e);
    return acc;
  }, {});

  // Bumped whenever entries shift or a fresh synthesis lands → NodeMap refetches.
  const graphSignal = `${entries.length}-${
    synthesisState.status === "ready" ? synthesisState.synthesis.updatedAt : "x"
  }`;

  const freshIds = new Set(entries.filter((e) => !baselineIds.has(e.id)).map((e) => e.id));

  const isInterview = pageMode === "interview";
  const isCanvas = pageMode === "canvas";

  // Triggered only when the user explicitly clicks "인터뷰에서 이 답변 보기"
  // inside the floating detail panel — node taps just open the panel.
  function handleJumpToEntry(entryId: string) {
    setPageMode("interview");
    setTimeout(() => scrollToEntry(entryId), 0);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-hidden">
      {/* Top bar — page mode toggle centered (Claude-home pattern). */}
      {/* "요약보기" used to live here but pressing it from canvas mode forced */}
      {/* a tab-flip back to interview to reveal the result, which felt awkward. */}
      {/* It now lives inside the side panel header so it's only reachable from */}
      {/* the surface where the synthesis actually renders. */}
      <div className="shrink-0 border-b border-border bg-surface px-4 py-2.5 grid grid-cols-3 items-center gap-3">
        <h1 className="text-sm font-semibold text-foreground flex items-center gap-2 justify-self-start">
          <Brain size={16} className="text-violet-600" />
          Self Map
        </h1>
        <div className="inline-flex items-center rounded-md border border-border bg-canvas p-0.5 text-xs justify-self-center">
          <button
            onClick={() => setPageMode("interview")}
            className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
              isInterview ? "bg-violet-600 text-white" : "text-muted hover:text-foreground"
            }`}
          >
            <MessageSquare size={12} />
            인터뷰
          </button>
          <button
            onClick={() => setPageMode("canvas")}
            className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
              isCanvas ? "bg-violet-600 text-white" : "text-muted hover:text-foreground"
            }`}
          >
            <Network size={12} />
            캔버스
          </button>
        </div>
        <div />
      </div>

      {/* Main row */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Left main panel: chat in interview mode, node map in canvas mode. */}
        {/* Mobile interview pre-start hides this panel — the side panel takes */}
        {/* over as the default view and triggers chat via its CTA button. */}
        <div
          className={`flex-col flex-1 min-h-0 md:border-r md:border-border ${
            isInterview && !started ? "hidden md:flex" : "flex"
          }`}
        >
          {isInterview && (
            <>
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-surface">
                <Brain size={18} className="text-violet-600" />
                <h2 className="font-semibold text-foreground">Self Insight Agent</h2>
                <span className="text-xs text-muted ml-1">— 나를 이해하는 인터뷰</span>
                {started && (
                  <button
                    onClick={endSession}
                    disabled={ending}
                    className="ml-auto text-xs text-muted hover:text-violet-600 disabled:opacity-40 transition-colors"
                  >
                    {ending ? "저장 중…" : "오늘은 여기까지"}
                  </button>
                )}
              </div>

              {modeHintLine && started && (
                <div className="px-5 py-2 text-xs text-violet-600 bg-violet-50/60 border-b border-violet-100">
                  {modeHintLine}
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-canvas">
                {!started && (
                  <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
                    <Brain size={40} className="text-violet-400 opacity-60" />
                    <div>
                      <p className="text-sm text-foreground font-medium">Self Insight Agent와 대화를 시작하세요</p>
                      <p className="text-xs text-muted mt-1">관심사, 강점, 몰입 경험, 혐오, 네트워크를 탐색합니다</p>
                    </div>
                    <button
                      onClick={() => startSession()}
                      disabled={opening}
                      className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {opening && <Loader2 size={14} className="animate-spin" />}
                      인터뷰 시작
                    </button>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-violet-600 text-white"
                          : "bg-surface text-body border border-border shadow-sm"
                      }`}
                    >
                      {msg.content || <span className="animate-pulse">▋</span>}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {started && (
                <div className="px-4 py-3 border-t border-border bg-surface space-y-2">
                  {/* Deep-dive topic hint — session-scoped client state */}
                  {editingTopic ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setDeepDiveTopic(topicDraft.trim());
                        setEditingTopic(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Sparkles size={12} className="text-violet-500 shrink-0" />
                      <input
                        autoFocus
                        value={topicDraft}
                        onChange={(e) => setTopicDraft(e.target.value)}
                        placeholder="더 파고들고 싶은 주제 (예: 최근 몰입했던 사이드 프로젝트)"
                        className="flex-1 rounded-md border border-violet-200 bg-canvas px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <button
                        type="submit"
                        className="text-xs rounded-md bg-violet-600 text-white px-2.5 py-1 hover:bg-violet-500"
                      >
                        적용
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTopic(false);
                          setTopicDraft(deepDiveTopic);
                        }}
                        className="text-xs text-tertiary hover:text-secondary px-1"
                      >
                        취소
                      </button>
                    </form>
                  ) : deepDiveTopic ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs text-violet-700">
                        <Sparkles size={10} />
                        깊이 파고들기: <span className="font-medium">{deepDiveTopic}</span>
                        <button
                          onClick={() => setDeepDiveTopic("")}
                          className="text-violet-500 hover:text-violet-700"
                          aria-label="주제 초기화"
                        >
                          <X size={10} />
                        </button>
                      </span>
                      <button
                        onClick={() => {
                          setTopicDraft(deepDiveTopic);
                          setEditingTopic(true);
                        }}
                        className="text-xs text-tertiary hover:text-secondary inline-flex items-center gap-1"
                      >
                        <Pencil size={10} /> 변경
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setTopicDraft("");
                        setEditingTopic(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-tertiary hover:text-violet-600"
                    >
                      <Sparkles size={12} /> + 이 주제로 더 파고들기
                    </button>
                  )}

                  <form
                    onSubmit={(e) => { e.preventDefault(); if (input.trim() && !streaming) sendMessage(input); }}
                    className="flex gap-2"
                  >
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="답변을 입력하세요..."
                      disabled={streaming}
                      className="flex-1 rounded-lg border border-border bg-canvas px-4 py-2.5 text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={streaming || !input.trim()}
                      className="rounded-lg bg-violet-600 px-4 py-2.5 text-white hover:bg-violet-500 disabled:opacity-40 transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {isCanvas && (
            <div className="flex flex-1 min-h-0 flex-col overflow-y-auto bg-canvas p-3 md:p-5">
              <div className="mx-auto w-full max-w-5xl space-y-4">
                <FounderIdentityCard
                  state={synthesisState}
                  entries={entries}
                  onPatchStatement={patchSynthesisStatement}
                  onCiteClick={scrollToEntry}
                />
                <TagCloud entries={entries} onJumpToEntry={handleJumpToEntry} />
                <div className="flex h-[60vh] min-h-[420px] rounded-xl border border-border bg-surface overflow-hidden">
                  <NodeMap
                    refreshSignal={graphSignal}
                    entries={entries}
                    clusterMeanings={
                      synthesisState.status === "ready"
                        ? synthesisState.synthesis.clusterMeanings ?? []
                        : []
                    }
                    onJumpToEntry={handleJumpToEntry}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right side panel — Self Map content. */}
        {/* Desktop interview: side rail next to chat. */}
        {/* Mobile interview pre-start: takes the full screen as the default */}
        {/*   view; chat is launched via the CTA below the header. */}
        {/* Mobile interview during chat: hidden so chat fills the screen. */}
        {/* Canvas mode: hidden on every viewport. */}
        <div
          className={`flex-col overflow-y-auto bg-surface flex-1 md:flex-initial md:w-96 lg:w-[28rem] xl:w-[32rem] md:shrink-0 ${
            isCanvas ? "hidden" : started ? "hidden md:flex" : "flex md:flex"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Self Map</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshSynthesis}
                disabled={refreshingSynthesis || entries.length < 3}
                title={
                  entries.length < 3
                    ? "엔트리가 3개 이상일 때 요약을 정리할 수 있어요"
                    : "AI로 정체성·tension·gap을 다시 정리"
                }
                className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:bg-violet-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {refreshingSynthesis ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                요약보기
              </button>
              <button
                onClick={async () => {
                  await fetchEntries();
                  await loadSynthesis();
                }}
                className="text-subtle hover:text-secondary p-1 rounded"
                title="새로고침"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Mobile-only CTA: prominent interview launcher. Hidden on desktop */}
          {/* (chat panel already shows its own start button) and once started. */}
          {!started && (
            <div className="md:hidden px-4 pt-4">
              <button
                onClick={() => startSession()}
                disabled={opening}
                className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {opening ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                인터뷰 시작
              </button>
            </div>
          )}

          <div className="px-4 py-4 space-y-4">
            {synthesisState.status === "ready" && (
              <TensionGapSide
                synthesis={synthesisState.synthesis}
                entries={entries}
                onCiteClick={scrollToEntry}
                onDismissTension={dismissTension}
                onStartGapInterview={startGapInterview}
              />
            )}

            {entries.length === 0 && (
              <p className="text-xs text-subtle text-center py-8">대화하면 여기에 자동으로 정리됩니다</p>
            )}

            {Object.entries(grouped).map(([cat, items]) => {
              const meta = CATEGORY_LABELS[cat] ?? CATEGORY_LABELS.other;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Badge variant={meta.color}>{meta.label}</Badge>
                    <span className="text-[10px] text-subtle">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((e) => {
                      const isFresh = freshIds.has(e.id);
                      return (
                        <Card
                          key={e.id}
                          data-entry-id={e.id}
                          className={`p-3 relative transition-shadow ${isFresh ? "ring-1 ring-violet-200" : ""}`}
                        >
                          {isFresh && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-violet-500" />
                          )}
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-xs text-muted flex-1">{e.question}</p>
                            <div className="flex gap-0.5 shrink-0">
                              <button
                                onClick={() => openEdit(e)}
                                className="p-1 text-subtle hover:text-violet-600 transition-colors rounded"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => deleteEntry(e.id)}
                                className="p-1 text-subtle hover:text-red-500 transition-colors rounded"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-body">{e.answer}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            {e.tags && e.tags.split(",").filter(Boolean).map((t) => (
                              <span key={t} className="text-xs bg-wash text-tertiary rounded px-1.5 py-0.5">{t.trim()}</span>
                            ))}
                            {isFresh && (
                              <span className="text-[10px] text-violet-600 ml-auto">이번 대화</span>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl border border-border shadow-lg w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-sm text-foreground">Self Map 항목 편집</h2>
              <button onClick={() => setEditingEntry(null)} className="p-1 text-subtle hover:text-secondary rounded">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted mb-1.5 block font-medium">카테고리</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]?.label ?? c} ({c})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block font-medium">질문</label>
                <input
                  value={editForm.question}
                  onChange={(e) => setEditForm((p) => ({ ...p, question: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block font-medium">답변</label>
                <textarea
                  value={editForm.answer}
                  onChange={(e) => setEditForm((p) => ({ ...p, answer: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block font-medium">태그 (콤마 구분)</label>
                <input
                  value={editForm.tags}
                  onChange={(e) => setEditForm((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="태그1,태그2,태그3"
                  className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditingEntry(null)}
                  className="flex-1 rounded-lg border border-border py-2.5 text-sm text-secondary hover:bg-canvas transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
