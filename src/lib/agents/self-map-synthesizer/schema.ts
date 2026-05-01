import { z } from "zod";

export const SELF_MAP_CATEGORIES = [
  "interests",
  "strengths",
  "aversions",
  "flow",
  "network",
  "other",
] as const;

export const tensionSchema = z.object({
  entryIdA: z.string().min(1),
  entryIdB: z.string().min(1),
  description: z.string().min(10),
});

export const gapSchema = z.object({
  category: z.enum(SELF_MAP_CATEGORIES),
  reason: z.string().min(10),
});

export const threadSchema = z.object({
  summary: z.string().min(10),
  relatedEntryIds: z.array(z.string()).max(5).default([]),
});

// Per-entry tags map used by the node map. Each value is 0~7 short tags
// (Korean nouns / compound nouns). Empty record default lets the agent
// no-op when entries are too sparse.
export const entryTagsByEntryIdSchema = z.record(
  z.string(),
  z.array(z.string().min(1)).max(7),
);

// Per-category one-line meaning rendered above the compound box in the
// canvas. Only categories with at least 2 entries are eligible — single
// entry doesn't form a cluster with a recognizable pattern.
export const clusterMeaningSchema = z.object({
  category: z.enum(SELF_MAP_CATEGORIES),
  oneLine: z.string().min(8).max(120),
});

export const synthesizerOutputSchema = z.object({
  identityStatement: z.string().min(20).max(400),
  citedEntryIds: z.array(z.string()).min(1).max(8),
  tensions: z.array(tensionSchema).max(3).default([]),
  gaps: z.array(gapSchema).max(3).default([]),
  threadToResume: z.array(threadSchema).max(2).default([]),
  entryTagsByEntryId: entryTagsByEntryIdSchema.default({}),
  clusterMeanings: z.array(clusterMeaningSchema).max(6).default([]),
});

export type SynthesizerClusterMeaning = z.infer<typeof clusterMeaningSchema>;

export type SynthesizerTension = z.infer<typeof tensionSchema>;
export type SynthesizerGap = z.infer<typeof gapSchema>;
export type SynthesizerThread = z.infer<typeof threadSchema>;
export type SynthesizerOutput = z.infer<typeof synthesizerOutputSchema>;
