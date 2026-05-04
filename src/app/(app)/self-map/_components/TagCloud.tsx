"use client";

import { Hash } from "lucide-react";

type Entry = { id: string; category: string; tags: string };

const CATEGORY_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  interests: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  strengths: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  aversions: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  flow: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  network: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  other: { bg: "bg-wash", text: "text-tertiary", border: "border-border" },
};

// Frequency → font/padding tier. Aggressively flat — extra tiers add visual
// noise without conveying more signal at this entry volume.
function tierFor(count: number, max: number): { cls: string; weight: string } {
  const ratio = max > 0 ? count / max : 0;
  if (ratio >= 0.75) return { cls: "text-base px-3 py-1.5", weight: "font-semibold" };
  if (ratio >= 0.5) return { cls: "text-sm px-2.5 py-1", weight: "font-medium" };
  if (ratio >= 0.25) return { cls: "text-xs px-2 py-0.5", weight: "font-medium" };
  return { cls: "text-xs px-2 py-0.5", weight: "" };
}

const MAX_TAGS = 60;

type Aggregated = {
  tag: string;
  count: number;
  category: string;
  firstEntryId: string;
};

function aggregate(entries: Entry[]): Aggregated[] {
  const buckets = new Map<string, { count: number; categoryCounts: Map<string, number>; firstEntryId: string }>();
  for (const e of entries) {
    const tags = e.tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    for (const tag of tags) {
      const bucket = buckets.get(tag);
      if (bucket) {
        bucket.count += 1;
        bucket.categoryCounts.set(e.category, (bucket.categoryCounts.get(e.category) ?? 0) + 1);
      } else {
        buckets.set(tag, {
          count: 1,
          categoryCounts: new Map([[e.category, 1]]),
          firstEntryId: e.id,
        });
      }
    }
  }
  const result: Aggregated[] = [];
  for (const [tag, b] of buckets) {
    let dominantCat = "other";
    let topCount = 0;
    for (const [cat, c] of b.categoryCounts) {
      if (c > topCount) {
        dominantCat = cat;
        topCount = c;
      }
    }
    result.push({ tag, count: b.count, category: dominantCat, firstEntryId: b.firstEntryId });
  }
  result.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  return result.slice(0, MAX_TAGS);
}

export function TagCloud({
  entries,
  onJumpToEntry,
}: {
  entries: Entry[];
  onJumpToEntry: (entryId: string) => void;
}) {
  const tags = aggregate(entries);
  if (tags.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-wash px-4 py-6 text-center">
        <Hash size={16} className="mx-auto mb-1 text-subtle" />
        <p className="text-xs text-subtle">대화가 쌓이면 키워드가 여기에 모입니다</p>
      </div>
    );
  }
  const max = tags[0]?.count ?? 1;
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Hash size={12} className="text-tertiary" />
        <p className="text-xs font-medium text-tertiary">키워드</p>
        <span className="text-xs text-subtle">· {tags.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => {
          const color = CATEGORY_COLOR[t.category] ?? CATEGORY_COLOR.other;
          const tier = tierFor(t.count, max);
          return (
            <button
              key={t.tag}
              onClick={() => onJumpToEntry(t.firstEntryId)}
              title={`${t.tag} · ${t.count}회 — 클릭하면 첫 항목으로 이동`}
              className={`inline-flex items-center rounded-full border ${color.bg} ${color.text} ${color.border} ${tier.cls} ${tier.weight} hover:brightness-95 transition`}
            >
              {t.tag}
              {t.count > 1 && <span className="ml-1 opacity-60">·{t.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
