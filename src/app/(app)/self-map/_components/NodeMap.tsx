"use client";

import { useEffect, useRef, useState } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import { ArrowRight, Loader2, X } from "lucide-react";

let coseRegistered = false;

export type GraphNode = {
  id: string;
  label: string;
  category: string;
  tags: string[];
};

export type GraphEdge = {
  source: string;
  target: string;
  sharedTags: string[];
  weight: number;
};

type GraphResponse = { nodes: GraphNode[]; edges: GraphEdge[] };

export type NodeMapEntry = {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string;
};

const CATEGORY_COLOR: Record<string, string> = {
  interests: "#8b5cf6",
  strengths: "#10b981",
  aversions: "#ef4444",
  flow: "#f59e0b",
  network: "#3b82f6",
  other: "#a78bfa",
};

const CATEGORY_LABEL_KO: Record<string, string> = {
  interests: "관심사",
  strengths: "강점",
  aversions: "혐오",
  flow: "몰입 경험",
  network: "네트워크",
  other: "기타",
};

function colorFor(category: string): string {
  return CATEGORY_COLOR[category] ?? CATEGORY_COLOR.other;
}

function shortLabel(question: string): string {
  // 노드 옆 라벨 — 호버 popover에 전체 카드가 뜨므로 여기는 식별용 단서만.
  const trimmed = question.trim();
  return trimmed.length > 10 ? `${trimmed.slice(0, 10)}…` : trimmed;
}

const CATEGORY_ORDER = ["interests", "strengths", "aversions", "flow", "network", "other"] as const;

export function NodeMap({
  refreshSignal,
  entries,
  onJumpToEntry,
}: {
  refreshSignal: string | number;
  entries: NodeMapEntry[];
  // Optional — when provided, the detail panel exposes "인터뷰에서 이 답변 보기"
  // which calls back so the page can flip to interview mode + scroll.
  onJumpToEntry?: (entryId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const hoveredEntry = hoveredNodeId ? entries.find((e) => e.id === hoveredNodeId) : null;
  const selectedEntry = selectedNodeId ? entries.find((e) => e.id === selectedNodeId) : null;

  // Fetch on mount + whenever refreshSignal flips.
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    fetch("/api/self-map/graph")
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return (await res.json()) as GraphResponse;
      })
      .then((data) => {
        if (!cancelled) setGraph(data);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  // Initialize / re-render cytoscape whenever graph data changes.
  useEffect(() => {
    if (!graph || !containerRef.current) return;

    if (!coseRegistered) {
      cytoscape.use(coseBilkent);
      coseRegistered = true;
    }

    cyRef.current?.destroy();

    // Compound parent nodes — one per category that has at least one entry.
    // cose-bilkent groups children of the same parent together, so this both
    // produces a category-named box around the cluster and pulls semantically
    // related nodes physically closer.
    const presentCategories = CATEGORY_ORDER.filter((cat) =>
      graph.nodes.some((n) => n.category === cat),
    );

    const parentElements: ElementDefinition[] = presentCategories.map((cat) => ({
      data: {
        id: `cat-${cat}`,
        label: CATEGORY_LABEL_KO[cat] ?? cat,
        category: cat,
      },
      classes: "category-parent",
    }));

    const elements: ElementDefinition[] = [
      ...parentElements,
      ...graph.nodes.map((n) => ({
        data: {
          id: n.id,
          label: shortLabel(n.label),
          fullLabel: n.label,
          category: n.category,
          tags: n.tags.join(", "),
          parent: presentCategories.includes(
            n.category as (typeof CATEGORY_ORDER)[number],
          )
            ? `cat-${n.category}`
            : undefined,
        },
      })),
      ...graph.edges.map((e, i) => ({
        data: {
          id: `e${i}`,
          source: e.source,
          target: e.target,
          shared: e.sharedTags.join(", "),
          weight: e.weight,
        },
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node:childless",
          style: {
            "background-color": (ele: cytoscape.NodeSingular) => colorFor(ele.data("category")),
            label: "data(label)",
            color: "#1f2937",
            "font-size": "12px",
            "font-weight": 500,
            "text-valign": "bottom",
            "text-margin-y": 8,
            "text-wrap": "wrap",
            "text-max-width": "100px",
            width: 28,
            height: 28,
            "border-width": 2,
            "border-color": "#ffffff",
          },
        },
        {
          selector: "node:childless:selected",
          style: {
            "border-width": 3,
            "border-color": "#7c3aed",
          },
        },
        {
          selector: "node:parent",
          style: {
            "background-color": (ele: cytoscape.NodeSingular) => colorFor(ele.data("category")),
            "background-opacity": 0.08,
            "border-width": 1.5,
            "border-color": (ele: cytoscape.NodeSingular) => colorFor(ele.data("category")),
            "border-style": "dashed",
            label: "data(label)",
            "font-size": "13px",
            "font-weight": 700,
            color: (ele: cytoscape.NodeSingular) => colorFor(ele.data("category")),
            "text-valign": "top",
            "text-halign": "center",
            "text-margin-y": -6,
            shape: "round-rectangle",
            padding: "16px",
            "min-width": "60px",
            "min-height": "60px",
          },
        },
        {
          selector: "edge",
          style: {
            width: (ele: cytoscape.EdgeSingular) =>
              1 + Math.min(Number(ele.data("weight")) || 1, 4),
            "line-color": "#cbd5e1",
            "curve-style": "bezier",
            opacity: 0.5,
          },
        },
        {
          selector: "edge:hover",
          style: { "line-color": "#8b5cf6", opacity: 1 },
        },
      ],
      layout: {
        name: "cose-bilkent",
        animate: false,
        nodeRepulsion: 6500,
        idealEdgeLength: 100,
        edgeElasticity: 0.45,
        randomize: true,
        fit: true,
        padding: 30,
      } as cytoscape.LayoutOptions,
      wheelSensitivity: 0.2,
      minZoom: 0.3,
      maxZoom: 3,
    });

    cy.on("tap", "node:childless", (evt) => {
      setSelectedNodeId(evt.target.id());
    });
    cy.on("tap", (evt) => {
      // Background or compound-parent click closes the detail panel.
      if (evt.target === cy || evt.target.isParent?.()) setSelectedNodeId(null);
    });
    cy.on("mouseover", "node:childless", (evt) => {
      const pos = evt.target.renderedPosition();
      setHoverPos({ x: pos.x, y: pos.y });
      setHoveredNodeId(evt.target.id());
    });
    cy.on("mouseout", "node:childless", () => {
      setHoveredNodeId(null);
      setHoverPos(null);
    });

    cyRef.current = cy;

    // ResizeObserver — 컨테이너의 첫 nonzero 크기 도달 시 layout을 재실행해
    // 큰 캔버스 폭에 맞게 노드를 다시 펼친다. 단순 fit()만 하면 viewport zoom만
    // 변하고 노드 좌표는 좁은 mount 시점 기준에 갇혀 화면 한쪽에 몰린다.
    let pendingFrame = 0;
    let initialLayoutDone = false;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      const h = entries[0]?.contentRect.height ?? 0;
      if (w < 50 || h < 50) return;
      setContainerWidth(w);

      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      pendingFrame = requestAnimationFrame(() => {
        cy.resize();
        if (!initialLayoutDone) {
          cy.layout({
            name: "cose-bilkent",
            animate: false,
            fit: true,
            randomize: false,
            idealEdgeLength: 100,
            nodeRepulsion: 6500,
            padding: 30,
          } as cytoscape.LayoutOptions).run();
          initialLayoutDone = true;
        } else {
          cy.fit(undefined, 30);
        }
      });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      cy.destroy();
      if (cyRef.current === cy) cyRef.current = null;
    };
  }, [graph]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-canvas h-full min-h-64 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-violet-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/40 p-4 text-xs text-red-700">
        노드맵 로드 실패: {error}
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-canvas h-full min-h-64 flex items-center justify-center">
        <p className="text-xs text-subtle text-center px-4">
          대화하면 여기에 노드가 생겨요.
          <br />
          답변마다 한 노드, 공유 태그가 엣지로 연결됩니다.
        </p>
      </div>
    );
  }

  // Hover popover position — flip horizontally if the node sits in the right
  // half so the card stays inside the canvas. Pointer-events disabled so the
  // mouse never lands on the popover itself (avoids hover thrashing).
  const popoverWidth = 288;
  const popoverPos = hoverPos && containerWidth > 0
    ? hoverPos.x + popoverWidth + 24 > containerWidth
      ? { right: containerWidth - hoverPos.x + 14, top: Math.max(8, hoverPos.y - 30) }
      : { left: hoverPos.x + 14, top: Math.max(8, hoverPos.y - 30) }
    : null;
  const showHoverPopover = hoveredEntry && popoverPos && !selectedEntry;

  return (
    <div className="relative rounded-xl border border-border bg-canvas overflow-hidden flex flex-col h-full min-h-0 w-full">
      <div ref={containerRef} className="w-full flex-1 min-h-0" />

      {/* Top-left legend — category color key. Backdrop blur so it stays */}
      {/* legible over nodes that drift behind it. */}
      <div className="absolute top-3 left-3 rounded-lg border border-border bg-surface/95 backdrop-blur-sm shadow-sm px-2.5 py-2 z-10">
        <div className="text-[9px] text-subtle mb-1.5 font-medium tracking-wide uppercase">
          카테고리
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {(["interests", "strengths", "aversions", "flow", "network"] as const).map((cat) => (
            <div key={cat} className="flex items-center gap-1.5 text-[10px]">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: CATEGORY_COLOR[cat] }}
              />
              <span className="text-tertiary">{CATEGORY_LABEL_KO[cat]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hover popover — quick preview anchored next to the node. */}
      {showHoverPopover && hoveredEntry && popoverPos && (
        <div
          className="absolute pointer-events-none z-10 rounded-xl border border-border bg-surface shadow-md px-3 py-2.5"
          style={{ ...popoverPos, width: popoverWidth, maxWidth: popoverWidth }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: colorFor(hoveredEntry.category) }}
            />
            <span className="text-[10px] font-medium text-tertiary">
              {CATEGORY_LABEL_KO[hoveredEntry.category] ?? hoveredEntry.category}
            </span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed mb-1">{hoveredEntry.question}</p>
          <p className="text-xs text-body leading-relaxed whitespace-pre-wrap line-clamp-5">
            {hoveredEntry.answer}
          </p>
          {hoveredEntry.tags && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {hoveredEntry.tags
                .split(",")
                .filter(Boolean)
                .slice(0, 6)
                .map((t) => (
                  <span
                    key={t}
                    className="text-[10px] bg-wash text-tertiary rounded px-1.5 py-0.5"
                  >
                    {t.trim()}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      {selectedEntry && (
        <div className="absolute top-3 right-3 max-w-sm w-[min(22rem,calc(100%-1.5rem))] rounded-xl border border-border bg-surface shadow-lg z-10">
          <div className="flex items-start justify-between gap-2 px-4 pt-3">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: colorFor(selectedEntry.category) }}
              />
              <span className="text-[10px] font-medium text-tertiary">
                {CATEGORY_LABEL_KO[selectedEntry.category] ?? selectedEntry.category}
              </span>
            </div>
            <button
              onClick={() => setSelectedNodeId(null)}
              className="p-0.5 text-subtle hover:text-secondary rounded"
              aria-label="닫기"
            >
              <X size={14} />
            </button>
          </div>
          <div className="px-4 pb-3 pt-1.5">
            <p className="text-xs text-muted mb-1 leading-relaxed">{selectedEntry.question}</p>
            <p className="text-sm text-body leading-relaxed whitespace-pre-wrap">
              {selectedEntry.answer}
            </p>
            {selectedEntry.tags && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedEntry.tags
                  .split(",")
                  .filter(Boolean)
                  .map((t) => (
                    <span
                      key={t}
                      className="text-[10px] bg-wash text-tertiary rounded px-1.5 py-0.5"
                    >
                      {t.trim()}
                    </span>
                  ))}
              </div>
            )}
            {onJumpToEntry && (
              <button
                onClick={() => onJumpToEntry(selectedEntry.id)}
                className="mt-3 text-[11px] text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
              >
                인터뷰에서 이 답변 보기 <ArrowRight size={11} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="shrink-0 px-3 py-2 border-t border-border text-[11px] text-subtle flex items-center justify-between gap-3">
        <span className="shrink-0">
          노드 {graph.nodes.length} · 엣지 {graph.edges.length}
        </span>
        <span className="truncate text-right">
          가까울수록 공유 태그 ↑ · 호버: 미리보기 · 클릭: 상세
        </span>
      </div>
    </div>
  );
}
