"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Trash2, Brain, RefreshCw } from "lucide-react";
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

const SESSION_ID = `self-${Date.now()}`;

function cleanContent(text: string) {
  return text.replace(/---SAVE---[\s\S]*?---END---/g, "").trim();
}

export default function SelfMapPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [entries, setEntries] = useState<SelfMapEntry[]>([]);
  const [started, setStarted] = useState(false);
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
      const display = cleanContent(assistantText);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: display };
        return next;
      });
    }

    setStreaming(false);
    await fetchEntries();
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
      <div className="flex flex-col flex-1 border-r border-neutral-800">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-neutral-800">
          <Brain size={18} className="text-violet-400" />
          <h1 className="font-semibold">Self Insight Agent</h1>
          <span className="text-xs text-neutral-500 ml-1">— 나를 이해하는 인터뷰</span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!started && (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
              <Brain size={40} className="text-violet-400 opacity-60" />
              <div>
                <p className="text-sm text-neutral-300 font-medium">Self Insight Agent와 대화를 시작하세요</p>
                <p className="text-xs text-neutral-500 mt-1">관심사, 강점, 몰입 경험, 혐오, 네트워크를 탐색합니다</p>
              </div>
              <button
                onClick={startSession}
                className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-500 transition-colors"
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
                    : "bg-neutral-800 text-neutral-100"
                }`}
              >
                {msg.content || <span className="animate-pulse">▋</span>}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {started && (
          <div className="px-4 py-3 border-t border-neutral-800">
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
                className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="rounded-lg bg-violet-600 px-4 py-2.5 hover:bg-violet-500 disabled:opacity-40 transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Self Map panel */}
      <div className="w-80 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-800">
          <h2 className="text-sm font-semibold">Self Map</h2>
          <button onClick={fetchEntries} className="text-neutral-500 hover:text-neutral-300">
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="px-4 py-4 space-y-4">
          {entries.length === 0 && (
            <p className="text-xs text-neutral-500 text-center py-8">대화하면 여기에 자동으로 정리됩니다</p>
          )}
          {Object.entries(grouped).map(([cat, items]) => {
            const meta = CATEGORY_LABELS[cat] ?? CATEGORY_LABELS.other;
            return (
              <div key={cat}>
                <Badge variant={meta.color} className="mb-2">{meta.label}</Badge>
                <div className="space-y-2">
                  {items.map((e) => (
                    <Card key={e.id} className="p-3 group relative">
                      <p className="text-xs text-neutral-400 mb-1">{e.question}</p>
                      <p className="text-sm text-neutral-200">{e.answer}</p>
                      {e.tags && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {e.tags.split(",").filter(Boolean).map((t) => (
                            <span key={t} className="text-xs bg-neutral-800 text-neutral-400 rounded px-1.5 py-0.5">{t.trim()}</span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => deleteEntry(e.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
