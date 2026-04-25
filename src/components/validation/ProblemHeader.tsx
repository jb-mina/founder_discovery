"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { ProblemDetailModal, type ProblemDetailData } from "./ProblemDetailModal";

export function ProblemHeader({
  problem,
  progressDots,
}: {
  problem: ProblemDetailData;
  progressDots: { confirmed: number; total: number };
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [showSlim, setShowSlim] = useState(false);
  const fullRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = fullRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowSlim(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px -10px 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* Slim sticky bar — appears only when full header scrolls out of view */}
      <div
        className={`fixed top-0 left-0 right-0 md:left-56 z-30 bg-surface/95 backdrop-blur-sm border-b border-border transition-transform ${
          showSlim ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="px-4 md:px-6 py-2 flex items-center gap-3">
          <Link href="/validation" className="text-subtle hover:text-secondary" aria-label="목록으로">
            <ArrowLeft size={16} />
          </Link>
          <p className="text-sm font-medium text-foreground line-clamp-1 flex-1 min-w-0">
            {problem.title}
          </p>
          <ProgressBadge confirmed={progressDots.confirmed} total={progressDots.total} />
        </div>
      </div>

      {/* Full header — non-sticky, always at top */}
      <div ref={fullRef} className="px-4 md:px-6 pt-4 pb-5 border-b border-border bg-surface">
        <div className="flex items-center gap-2 mb-3">
          <Link href="/validation" className="text-subtle hover:text-secondary" aria-label="목록으로">
            <ArrowLeft size={16} />
          </Link>
          <ProgressBadge confirmed={progressDots.confirmed} total={progressDots.total} />
        </div>

        <div className="flex items-start gap-2 mb-2">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground leading-tight flex-1 min-w-0">
            {problem.title}
          </h1>
          <button
            onClick={() => setDetailOpen(true)}
            className="text-subtle hover:text-violet-600 mt-1 shrink-0"
            aria-label="문제 상세 보기"
            title="문제 상세 보기"
          >
            <Info size={18} />
          </button>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-tertiary">
            <span className="text-subtle">타깃 고객 ·</span> {problem.who}
          </p>
          {problem.why && (
            <p className="text-xs text-muted line-clamp-2">
              <span className="text-subtle">왜 ·</span> {problem.why}
            </p>
          )}
        </div>
      </div>

      {detailOpen && (
        <ProblemDetailModal problem={problem} onClose={() => setDetailOpen(false)} />
      )}
    </>
  );
}

function ProgressBadge({ confirmed, total }: { confirmed: number; total: number }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full ${
            i < confirmed ? "bg-violet-600" : "bg-wash border border-border"
          }`}
        />
      ))}
      <span className="ml-1.5 text-xs text-tertiary">
        {confirmed}/{total}
      </span>
    </div>
  );
}
