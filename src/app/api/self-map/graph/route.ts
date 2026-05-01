import { NextResponse } from "next/server";
import {
  getLatestSynthesis,
  listSelfMapEntries,
  parseSynthesis,
  parseUserTagString,
  type CoreCategory,
} from "@/lib/db/self-map";

export type GraphNode = {
  id: string;
  label: string;       // question 앞 30자
  category: CoreCategory | string;
  tags: string[];      // effective tags (user + synthesis union)
};

export type GraphEdge = {
  source: string;
  target: string;
  sharedTags: string[];
  weight: number;      // sharedTags.length
};

export type GraphResponse = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

// GET — Self Map node map용 데이터.
// 노드 = SelfMapEntry, 엣지 = 두 엔트리가 공유 태그 1개 이상.
// 태그는 사용자 수동(SelfMapEntry.tags 콤마)과 Synthesizer 자동(synthesis.entryTagsByEntryId)
// 두 출처의 union — lowercase + trim + dedup.
export async function GET() {
  const [entries, synthesisRow] = await Promise.all([
    listSelfMapEntries(),
    getLatestSynthesis(),
  ]);

  const entryTagsBySynthesis = synthesisRow
    ? parseSynthesis(synthesisRow).entryTagsByEntryId
    : {};

  const nodes: GraphNode[] = entries.map((e) => {
    const userTags = parseUserTagString(e.tags);
    const synthesisTags = (entryTagsBySynthesis[e.id] ?? []).map((t) => t.trim().toLowerCase());
    const tags = Array.from(new Set([...userTags, ...synthesisTags]));
    return {
      id: e.id,
      label: e.question.slice(0, 30),
      category: e.category,
      tags,
    };
  });

  const edges: GraphEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    if (a.tags.length === 0) continue;
    const setA = new Set(a.tags);
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      if (b.tags.length === 0) continue;
      const shared = b.tags.filter((t) => setA.has(t));
      if (shared.length === 0) continue;
      edges.push({
        source: a.id,
        target: b.id,
        sharedTags: shared,
        weight: shared.length,
      });
    }
  }

  const body: GraphResponse = { nodes, edges };
  return NextResponse.json(body);
}
