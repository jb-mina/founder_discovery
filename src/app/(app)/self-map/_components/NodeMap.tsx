"use client";

import { useEffect, useRef, useState } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import { Loader2 } from "lucide-react";

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

const CATEGORY_COLOR: Record<string, string> = {
  interests: "#8b5cf6", // violet-500
  strengths: "#10b981", // green-500 ish
  aversions: "#ef4444", // red-500
  flow: "#f59e0b",      // amber-500
  network: "#3b82f6",   // blue-500
  other: "#a78bfa",     // violet-400
};

function colorFor(category: string): string {
  return CATEGORY_COLOR[category] ?? CATEGORY_COLOR.other;
}

export function NodeMap({
  refreshSignal,
  onNodeClick,
}: {
  refreshSignal: string | number;
  onNodeClick: (entryId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    const elements: ElementDefinition[] = [
      ...graph.nodes.map((n) => ({
        data: { id: n.id, label: n.label, category: n.category, tags: n.tags.join(", ") },
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
          selector: "node",
          style: {
            "background-color": (ele: cytoscape.NodeSingular) => colorFor(ele.data("category")),
            label: "data(label)",
            color: "#1f2937",
            "font-size": "10px",
            "text-valign": "bottom",
            "text-margin-y": 4,
            "text-wrap": "wrap",
            "text-max-width": "120px",
            width: 22,
            height: 22,
            "border-width": 2,
            "border-color": "#ffffff",
          },
        },
        {
          selector: "node:active",
          style: { "overlay-opacity": 0.1 },
        },
        {
          selector: "edge",
          style: {
            width: (ele: cytoscape.EdgeSingular) =>
              1 + Math.min(Number(ele.data("weight")) || 1, 4),
            "line-color": "#cbd5e1",
            "curve-style": "bezier",
            opacity: 0.6,
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
        nodeRepulsion: 4500,
        idealEdgeLength: 80,
        edgeElasticity: 0.45,
        randomize: true,
        fit: true,
        padding: 20,
      } as cytoscape.LayoutOptions,
      wheelSensitivity: 0.2,
      minZoom: 0.3,
      maxZoom: 3,
    });

    cy.on("tap", "node", (evt) => {
      const id = evt.target.id();
      onNodeClick(id);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      if (cyRef.current === cy) cyRef.current = null;
    };
  }, [graph, onNodeClick]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-canvas h-80 flex items-center justify-center">
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
      <div className="rounded-xl border border-dashed border-border bg-canvas h-80 flex items-center justify-center">
        <p className="text-xs text-subtle text-center px-4">
          대화하면 여기에 노드가 생겨요.
          <br />
          답변마다 한 노드, 공유 태그가 엣지로 연결됩니다.
        </p>
      </div>
    );
  }

  // Single node ⇒ no edges. Still render container for the node label.
  return (
    <div className="rounded-xl border border-border bg-canvas overflow-hidden">
      <div ref={containerRef} className="w-full" style={{ height: "420px" }} />
      <div className="px-3 py-2 border-t border-border text-[10px] text-subtle flex items-center justify-between">
        <span>노드 {graph.nodes.length} · 엣지 {graph.edges.length}</span>
        <span>노드 클릭 → 카드로 이동</span>
      </div>
    </div>
  );
}
