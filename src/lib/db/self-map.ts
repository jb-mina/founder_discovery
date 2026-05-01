import { prisma } from "@/lib/prisma";
import type { InterviewSession, SelfMapEntry, SelfMapSynthesis } from "@prisma/client";

export type CoreCategory = "interests" | "strengths" | "aversions" | "flow" | "network" | "other";

export const CORE_CATEGORIES: readonly CoreCategory[] = [
  "interests",
  "strengths",
  "aversions",
  "flow",
  "network",
  "other",
];

export type ThreadToResume = { summary: string; relatedEntryIds: string[] };
export type TensionEntry = { entryIdA: string; entryIdB: string; description: string };
export type GapEntry = { category: CoreCategory; reason: string };

// ---------------- Snapshot key ----------------

// Cache key for SelfMapSynthesis. Same key ⇒ Self Map hasn't shifted ⇒ reuse.
// Combines count and the latest updatedAt so any CRUD on entries flips it.
export function computeSnapshotKey(entries: { updatedAt: Date }[]): string {
  if (entries.length === 0) return "0-empty";
  const maxIso = entries
    .map((e) => e.updatedAt.toISOString())
    .reduce((acc, iso) => (iso > acc ? iso : acc), "");
  return `${entries.length}-${maxIso}`;
}

// ---------------- Self Map entries ----------------

export async function listSelfMapEntries(): Promise<SelfMapEntry[]> {
  return prisma.selfMapEntry.findMany({ orderBy: { createdAt: "asc" } });
}

export function categoryCoverage(entries: SelfMapEntry[]): Record<CoreCategory, number> {
  const counts: Record<CoreCategory, number> = {
    interests: 0,
    strengths: 0,
    aversions: 0,
    flow: 0,
    network: 0,
    other: 0,
  };
  for (const e of entries) {
    const c = (CORE_CATEGORIES as readonly string[]).includes(e.category)
      ? (e.category as CoreCategory)
      : "other";
    counts[c] += 1;
  }
  return counts;
}

// First (priority-ordered) category with ≤1 entries. Skips "other".
// Network / flow / aversions are surfaced first because creators tend to
// underfill them — interests/strengths fill themselves naturally.
export function firstUnderfilledCategory(coverage: Record<CoreCategory, number>): CoreCategory | null {
  const priority: CoreCategory[] = ["network", "flow", "aversions", "interests", "strengths"];
  for (const cat of priority) {
    if (coverage[cat] <= 1) return cat;
  }
  return null;
}

// ---------------- Synthesis cache ----------------

export async function getSynthesisBySnapshotKey(snapshotKey: string): Promise<SelfMapSynthesis | null> {
  return prisma.selfMapSynthesis.findUnique({ where: { snapshotKey } });
}

export async function getLatestSynthesis(): Promise<SelfMapSynthesis | null> {
  return prisma.selfMapSynthesis.findFirst({ orderBy: { updatedAt: "desc" } });
}

export type EntryTagsByEntryId = Record<string, string[]>;

export type SynthesisInput = {
  identityStatement: string;
  citedEntryIds: string[];
  tensions: TensionEntry[];
  gaps: GapEntry[];
  entryTagsByEntryId: EntryTagsByEntryId;
};

// Upsert by snapshotKey. Preserves userEditedStatement and dismissedTensionKeys
// across re-syntheses — those are user state, not LLM output.
export async function upsertSynthesis(
  snapshotKey: string,
  input: SynthesisInput,
): Promise<SelfMapSynthesis> {
  return prisma.selfMapSynthesis.upsert({
    where: { snapshotKey },
    create: {
      snapshotKey,
      identityStatement: input.identityStatement,
      citedEntryIds: JSON.stringify(input.citedEntryIds),
      tensions: JSON.stringify(input.tensions),
      gaps: JSON.stringify(input.gaps),
      entryTagsByEntryId: JSON.stringify(input.entryTagsByEntryId),
    },
    update: {
      identityStatement: input.identityStatement,
      citedEntryIds: JSON.stringify(input.citedEntryIds),
      tensions: JSON.stringify(input.tensions),
      gaps: JSON.stringify(input.gaps),
      entryTagsByEntryId: JSON.stringify(input.entryTagsByEntryId),
    },
  });
}

export async function patchSynthesis(
  id: string,
  patch: { userEditedStatement?: string | null; dismissedTensionKeys?: string[] },
): Promise<SelfMapSynthesis> {
  const data: { userEditedStatement?: string | null; dismissedTensionKeys?: string } = {};
  if (patch.userEditedStatement !== undefined) data.userEditedStatement = patch.userEditedStatement;
  if (patch.dismissedTensionKeys !== undefined)
    data.dismissedTensionKeys = JSON.stringify(patch.dismissedTensionKeys);
  return prisma.selfMapSynthesis.update({ where: { id }, data });
}

export type ParsedSynthesis = {
  id: string;
  snapshotKey: string;
  identityStatement: string;
  userEditedStatement: string | null;
  citedEntryIds: string[];
  tensions: TensionEntry[];
  gaps: GapEntry[];
  dismissedTensionKeys: string[];
  entryTagsByEntryId: EntryTagsByEntryId;
  updatedAt: Date;
};

export function parseSynthesis(row: SelfMapSynthesis): ParsedSynthesis {
  return {
    id: row.id,
    snapshotKey: row.snapshotKey,
    identityStatement: row.identityStatement,
    userEditedStatement: row.userEditedStatement,
    citedEntryIds: safeJsonArray<string>(row.citedEntryIds),
    tensions: safeJsonArray<TensionEntry>(row.tensions),
    gaps: safeJsonArray<GapEntry>(row.gaps),
    dismissedTensionKeys: safeJsonArray<string>(row.dismissedTensionKeys),
    entryTagsByEntryId: parseEntryTagsByEntryId(row.entryTagsByEntryId),
    updatedAt: row.updatedAt,
  };
}

function parseEntryTagsByEntryId(raw: string): EntryTagsByEntryId {
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: EntryTagsByEntryId = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        out[k] = val.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
      }
    }
    return out;
  } catch {
    return {};
  }
}

// User-edited tags string → normalized tag list. Lowercase + trim + dedup.
export function parseUserTagString(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0),
    ),
  );
}

// ---------------- Interview sessions ----------------

export async function createInterviewSession(input: {
  mode: string;
  modeContext: Record<string, unknown>;
  conversationSessionId: string;
}): Promise<InterviewSession> {
  return prisma.interviewSession.create({
    data: {
      mode: input.mode,
      modeContext: JSON.stringify(input.modeContext),
      conversationSessionId: input.conversationSessionId,
    },
  });
}

export async function endInterviewSession(
  id: string,
  meta: {
    threadToResume: ThreadToResume[];
    tensionCandidates: TensionEntry[];
    gapAreas: GapEntry[];
  },
): Promise<InterviewSession> {
  return prisma.interviewSession.update({
    where: { id },
    data: {
      endedAt: new Date(),
      threadToResume: JSON.stringify(meta.threadToResume),
      tensionCandidates: JSON.stringify(meta.tensionCandidates),
      gapAreas: JSON.stringify(meta.gapAreas),
    },
  });
}

// Latest session that finished via the explicit "오늘은 여기까지" button.
// Open-ended sessions (page exits without explicit end) are excluded — their
// thread/tension candidates would be unreliable speculation rather than user
// confirmation.
export async function findLatestEndedSession(): Promise<InterviewSession | null> {
  return prisma.interviewSession.findFirst({
    where: { endedAt: { not: null } },
    orderBy: { endedAt: "desc" },
  });
}

export async function findInterviewSessionById(id: string): Promise<InterviewSession | null> {
  return prisma.interviewSession.findUnique({ where: { id } });
}

export type ParsedInterviewSession = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  mode: string;
  modeContext: Record<string, unknown>;
  threadToResume: ThreadToResume[];
  tensionCandidates: TensionEntry[];
  gapAreas: GapEntry[];
  conversationSessionId: string;
};

export function parseInterviewSession(row: InterviewSession): ParsedInterviewSession {
  return {
    id: row.id,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    mode: row.mode,
    modeContext: safeJsonObject(row.modeContext),
    threadToResume: safeJsonArray<ThreadToResume>(row.threadToResume),
    tensionCandidates: safeJsonArray<TensionEntry>(row.tensionCandidates),
    gapAreas: safeJsonArray<GapEntry>(row.gapAreas),
    conversationSessionId: row.conversationSessionId,
  };
}

// ---------------- JSON parse guards ----------------

function safeJsonArray<T>(raw: string): T[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function safeJsonObject(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
