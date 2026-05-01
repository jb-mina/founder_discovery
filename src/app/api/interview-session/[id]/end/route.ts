import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSelfMapSynthesizer } from "@/lib/agents/self-map-synthesizer/run";
import {
  computeSnapshotKey,
  endInterviewSession,
  findInterviewSessionById,
  getLatestSynthesis,
  listSelfMapEntries,
  parseInterviewSession,
  parseSynthesis,
  patchSynthesis,
  upsertSynthesis,
} from "@/lib/db/self-map";

const RECENT_MESSAGES_LIMIT = 24;

// POST — "오늘은 여기까지" 종료. Synthesizer 한 번 호출로
// (1) Self Map 합성 캐시 갱신, (2) 이번 세션의 thread/tension/gap 메타 산출.
// 두 책임을 한 호출로 묶는 이유: 입력(entries + recentMessages)이 거의 같고
// 산출 형식이 통일돼 있어 1 콜로 끝내는 게 토큰·지연 모두 유리.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await findInterviewSessionById(id);
  if (!session) return NextResponse.json({ error: "session not found" }, { status: 404 });

  // Idempotent — second click does nothing destructive.
  if (session.endedAt) {
    const parsed = parseInterviewSession(session);
    return NextResponse.json({
      ok: true,
      alreadyEnded: true,
      threadToResume: parsed.threadToResume,
      tensionCandidates: parsed.tensionCandidates,
      gapAreas: parsed.gapAreas,
    });
  }

  const [entries, recentMessages, previousSynthesisRow] = await Promise.all([
    listSelfMapEntries(),
    prisma.agentConversation.findMany({
      where: { sessionId: session.conversationSessionId },
      orderBy: { createdAt: "asc" },
      take: RECENT_MESSAGES_LIMIT,
    }),
    getLatestSynthesis(),
  ]);

  const dismissedTensionKeys = previousSynthesisRow
    ? parseSynthesis(previousSynthesisRow).dismissedTensionKeys
    : [];

  // No entries yet ⇒ nothing meaningful to synthesize. Mark ended without
  // metadata so opening doesn't pick up an empty thread on the next session.
  if (entries.length < 3) {
    const ended = await endInterviewSession(id, {
      threadToResume: [],
      tensionCandidates: [],
      gapAreas: [],
    });
    return NextResponse.json({
      ok: true,
      synthesisId: null,
      threadToResume: [],
      tensionCandidates: [],
      gapAreas: [],
      endedAt: ended.endedAt,
    });
  }

  const synthesis = await runSelfMapSynthesizer({
    entries,
    dismissedTensionKeys,
    recentMessages: recentMessages.map((m) => ({ role: m.role, content: m.content })),
  });

  // Update Self Map synthesis cache for this snapshot.
  const snapshotKey = computeSnapshotKey(entries);
  let row = await upsertSynthesis(snapshotKey, {
    identityStatement: synthesis.identityStatement,
    citedEntryIds: synthesis.citedEntryIds,
    tensions: synthesis.tensions,
    gaps: synthesis.gaps,
    entryTagsByEntryId: synthesis.entryTagsByEntryId,
    clusterMeanings: synthesis.clusterMeanings,
  });
  if (previousSynthesisRow) {
    const prev = parseSynthesis(previousSynthesisRow);
    row = await patchSynthesis(row.id, {
      userEditedStatement: prev.userEditedStatement,
      dismissedTensionKeys: prev.dismissedTensionKeys,
    });
  }

  const ended = await endInterviewSession(id, {
    threadToResume: synthesis.threadToResume,
    tensionCandidates: synthesis.tensions,
    gapAreas: synthesis.gaps,
  });

  return NextResponse.json({
    ok: true,
    synthesisId: row.id,
    threadToResume: synthesis.threadToResume,
    tensionCandidates: synthesis.tensions,
    gapAreas: synthesis.gaps,
    endedAt: ended.endedAt,
  });
}
