import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  computeSnapshotKey,
  getSynthesisBySnapshotKey,
  listSelfMapEntries,
  parseSynthesis,
  patchSynthesis,
  upsertSynthesis,
} from "@/lib/db/self-map";
import { runSelfMapSynthesizer } from "@/lib/agents/self-map-synthesizer/run";
import { prisma } from "@/lib/prisma";

const MIN_ENTRIES_FOR_SYNTHESIS = 3;

// GET — Identity Card / Tension+Gap 사이드의 데이터 소스.
// snapshotKey 기준으로 캐시 hit이면 그대로, miss면 Synthesizer 호출 후 저장.
export async function GET() {
  const entries = await listSelfMapEntries();

  if (entries.length < MIN_ENTRIES_FOR_SYNTHESIS) {
    return NextResponse.json({
      ready: false,
      entryCount: entries.length,
      threshold: MIN_ENTRIES_FOR_SYNTHESIS,
    });
  }

  const snapshotKey = computeSnapshotKey(entries);
  const cached = await getSynthesisBySnapshotKey(snapshotKey);

  if (cached) {
    return NextResponse.json({
      ready: true,
      cached: true,
      synthesis: parseSynthesis(cached),
    });
  }

  // Cache miss — fetch latest synthesis to carry forward user edits and
  // dismissed tensions, then re-synthesize against the new snapshot.
  const previous = await prisma.selfMapSynthesis.findFirst({ orderBy: { updatedAt: "desc" } });
  const dismissedTensionKeys = previous ? parseSynthesis(previous).dismissedTensionKeys : [];

  const output = await runSelfMapSynthesizer({
    entries,
    dismissedTensionKeys,
  });

  const row = await upsertSynthesis(snapshotKey, {
    identityStatement: output.identityStatement,
    citedEntryIds: output.citedEntryIds,
    tensions: output.tensions,
    gaps: output.gaps,
    entryTagsByEntryId: output.entryTagsByEntryId,
  });

  // Carry forward user state.
  const merged = previous
    ? await patchSynthesis(row.id, {
        userEditedStatement: previous.userEditedStatement,
        dismissedTensionKeys,
      })
    : row;

  return NextResponse.json({
    ready: true,
    cached: false,
    synthesis: parseSynthesis(merged),
  });
}

const patchSchema = z.object({
  id: z.string().min(1),
  userEditedStatement: z.string().nullable().optional(),
  dismissTensionKey: z.string().min(1).optional(),
});

// PATCH — userEditedStatement 갱신 또는 dismissTensionKey 추가.
// dismissTensionKey는 sorted "idA|idB" 형식으로 보내면 dismissedTensionKeys에 union 추가.
export async function PATCH(req: NextRequest) {
  const body = patchSchema.parse(await req.json());

  const current = await prisma.selfMapSynthesis.findUnique({ where: { id: body.id } });
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  const parsedCurrent = parseSynthesis(current);
  const nextDismissed = body.dismissTensionKey
    ? Array.from(new Set([...parsedCurrent.dismissedTensionKeys, body.dismissTensionKey]))
    : undefined;

  const updated = await patchSynthesis(body.id, {
    userEditedStatement: body.userEditedStatement,
    dismissedTensionKeys: nextDismissed,
  });

  return NextResponse.json({ synthesis: parseSynthesis(updated) });
}
