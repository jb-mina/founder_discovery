"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Trash2, Brain, RefreshCw, Pencil, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Message = { role: "user" | "assistant"; content: string };
type SelfMapEntry = {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string;
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

const SESSION_ID = `self-${Date.now()}`;

export default function SelfMapPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [entries, setEntries] = useState<SelfMapEntry[]>([]);
  const [started, setStarted] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SelfMapEntry | null>(null);
  const [editForm, setEditForm] = useState({ category: "", question: "", answer: "", tags: "" });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/api/self-map");
    setEntries(await res.json());
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

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
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    const res = await fetch("/api/self-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages, sessionId: SESSION_ID }),
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
      body: JSON.stringify({ messages: finalMessages.slice(-6), sessionId: SESSION_ID }),
    })
      .then((r) => (r.ok && r.status === 201 ? fetchEntries() : undefined))
      .catch(() => {});

    inputRef.current?.focus();
  }

  async function startSession() {
    setStarted(true);
    await sendMessage("안녕하세요! 저는 창업을 준비하고 있어요. 자기 이해부터 시작하고 싶습니다.");
  }

  async function deleteEntry(id: string) {
    await fetch("/api/self-map", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchEntries();
  }

  const grouped = entries.reduce<Record<string, SelfMapEntry[]>>((acc, e) => {
    (acc[e.category] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Chat panel */}
      <div className="flex flex-col flex-1 border-r border-border">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-surface">
          <Brain size={18} className="text-violet-600" />
          <h1 className="font-semibold text-foreground">Self Insight Agent</h1>
          <span className="text-xs text-muted ml-1">— 나를 이해하는 인터뷰</span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-canvas">
          {!started && (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
              <Brain size={40} className="text-violet-400 opacity-60" />
              <div>
                <p className="text-sm text-foreground font-medium">Self Insight Agent와 대화를 시작하세요</p>
                <p className="text-xs text-muted mt-1">관심사, 강점, 몰입 경험, 혐오, 네트워크를 탐색합니다</p>
              </div>
              <button
                onClick={startSession}
                className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
              >
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
          <div className="px-4 py-3 border-t border-border bg-surface">
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
      </div>

      {/* Self Map panel */}
      <div className="w-80 shrink-0 overflow-y-auto bg-surface">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Self Map</h2>
          <button onClick={fetchEntries} className="text-subtle hover:text-secondary p-1 rounded">
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="px-4 py-4 space-y-4">
          {entries.length === 0 && (
            <p className="text-xs text-subtle text-center py-8">대화하면 여기에 자동으로 정리됩니다</p>
          )}
          {Object.entries(grouped).map(([cat, items]) => {
            const meta = CATEGORY_LABELS[cat] ?? CATEGORY_LABELS.other;
            return (
              <div key={cat}>
                <Badge variant={meta.color} className="mb-2">{meta.label}</Badge>
                <div className="space-y-2">
                  {items.map((e) => (
                    <Card key={e.id} className="p-3">
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
                      {e.tags && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {e.tags.split(",").filter(Boolean).map((t) => (
                            <span key={t} className="text-xs bg-wash text-tertiary rounded px-1.5 py-0.5">{t.trim()}</span>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
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
