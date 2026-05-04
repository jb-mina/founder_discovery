"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { METHOD_LABELS } from "@/lib/validation-labels";
import type { ValidationMethod } from "@/lib/agents/validation-designer/schema";

type MethodGuideView = {
  id: string;
  method: string;
  steps: string[];
  template: string;
  sampleSize: string;
  channels: string[];
  timeEstimate: string;
  watchOuts: string;
  updatedAt: string;
};

// Inline panel rendered under a method chip in AxisWorkspace. Lazy: GETs
// cached guide on mount, generates via POST on demand. Regenerate replaces
// the cached row (Method Coach is deterministic-ish and non-conversational,
// so refresh is safe).
export function MethodGuidePanel({
  hypothesisId,
  method,
}: {
  hypothesisId: string;
  method: ValidationMethod;
}) {
  const [guide, setGuide] = useState<MethodGuideView | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/hypotheses/${hypothesisId}/method-guide?method=${method}`,
        );
        if (!cancelled && res.ok) {
          const data = (await res.json()) as MethodGuideView | null;
          setGuide(data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hypothesisId, method]);

  async function generate(regenerate = false) {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/hypotheses/${hypothesisId}/method-guide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, regenerate }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `생성 실패 (${res.status})`);
      }
      const data = (await res.json()) as MethodGuideView;
      setGuide(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-subtle py-2">
        <Loader2 size={12} className="animate-spin" /> 가이드 확인 중...
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/40 px-3 py-2.5">
        <p className="text-xs text-secondary mb-2">
          이 메서드를 이 문제 카드 맥락에 맞게 어떻게 실행할지 AI가 가이드를 짜드립니다.
        </p>
        <button
          onClick={() => generate(false)}
          disabled={generating}
          className="flex items-center gap-1.5 text-xs rounded-lg bg-violet-600 text-white px-2.5 py-1.5 hover:bg-violet-500 disabled:opacity-60"
        >
          {generating ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <span>✨</span>
          )}
          {generating ? "가이드 생성 중..." : `${METHOD_LABELS[method]} 가이드 생성`}
        </button>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-surface p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-violet-700">
          {METHOD_LABELS[method]} 실행 가이드
        </p>
        <button
          onClick={() => generate(true)}
          disabled={generating}
          className="flex items-center gap-1 text-xs text-tertiary hover:text-secondary disabled:opacity-50"
          title="가이드를 새로 생성합니다"
        >
          {generating ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
          {generating ? "재생성 중..." : "재생성"}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <Section title="실행 단계">
        <ol className="space-y-1.5 list-decimal list-inside text-sm text-body">
          {guide.steps.map((s, i) => (
            <li key={i} className="whitespace-pre-wrap">{s}</li>
          ))}
        </ol>
      </Section>

      <Section title="템플릿 / Raw material">
        <div className="rounded-md bg-wash border border-border px-3 py-2">
          <Markdown content={guide.template} className="text-secondary" />
        </div>
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <MetaTile title="표본 수" value={guide.sampleSize} />
        <MetaTile title="소요 시간" value={guide.timeEstimate} />
        <MetaTile
          title="채널 제안"
          value={guide.channels.length > 0 ? guide.channels.join(", ") : "—"}
        />
      </div>

      {guide.watchOuts && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-medium text-amber-700 mb-0.5">함정 주의</p>
          <p className="text-xs text-amber-800 whitespace-pre-wrap">{guide.watchOuts}</p>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-tertiary mb-1.5">{title}</p>
      {children}
    </div>
  );
}

function MetaTile({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-canvas px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-tertiary mb-0.5">{title}</p>
      <p className="text-xs text-body whitespace-pre-wrap">{value}</p>
    </div>
  );
}
