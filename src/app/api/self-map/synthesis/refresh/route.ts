import { NextResponse } from "next/server";
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

// POST — 강제 재합성. 사용자가 Identity Card 새로고침 버튼을 눌렀을 때.
// 같은 snapshotKey 캐시가 있어도 무시하고 Synthesizer를 다시 호출 → upsert.
// 사용자 편집본/dismissedTensionKeys는 보존.
export async function POST() {
  const entries = await listSelfMapEntries();
  if (entries.length < 3) {
    return NextResponse.json({ ready: false, entryCount: entries.length, threshold: 3 });
  }

  const previous = await prisma.selfMapSynthesis.findFirst({ orderBy: { updatedAt: "desc" } });
  const previousParsed = previous ? parseSynthesis(previous) : null;

  const output = await runSelfMapSynthesizer({
    entries,
    dismissedTensionKeys: previousParsed?.dismissedTensionKeys ?? [],
  });

  const snapshotKey = computeSnapshotKey(entries);
  let row = await upsertSynthesis(snapshotKey, {
    identityStatement: output.identityStatement,
    citedEntryIds: output.citedEntryIds,
    tensions: output.tensions,
    gaps: output.gaps,
    entryTagsByEntryId: output.entryTagsByEntryId,
  });

  if (previousParsed) {
    row = await patchSynthesis(row.id, {
      userEditedStatement: previousParsed.userEditedStatement,
      dismissedTensionKeys: previousParsed.dismissedTensionKeys,
    });
  }

  // Re-fetch the existing cache row in case upsert returned a stale snapshot
  const fresh = (await getSynthesisBySnapshotKey(snapshotKey)) ?? row;

  return NextResponse.json({
    ready: true,
    cached: false,
    synthesis: parseSynthesis(fresh),
  });
}
