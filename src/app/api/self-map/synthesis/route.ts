import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  computeSnapshotKey,
  getSynthesisBySnapshotKey,
  listSelfMapEntries,
  parseSynthesis,
  patchSynthesis,
} from "@/lib/db/self-map";
import { prisma } from "@/lib/prisma";

const MIN_ENTRIES_FOR_SYNTHESIS = 3;

// GET — cache-only read. snapshotKey hit이면 캐시 반환, miss이면
// `cache_miss`로 응답해 클라이언트가 사용자 trigger ("요약보기" 버튼)에서만
// LLM 합성을 부르도록 한다. 자동 LLM 호출은 의도와 비용 양쪽 모두 어긋나
// 의도적으로 끊었다 — 합성은 POST /api/self-map/synthesis/refresh로만.
export async function GET() {
  const entries = await listSelfMapEntries();

  if (entries.length < MIN_ENTRIES_FOR_SYNTHESIS) {
    return NextResponse.json({
      ready: false,
      reason: "not_enough_entries",
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

  // Snapshot 변경(엔트리 추가/편집) 후 trigger 전 상태. 직전 합성 결과를 함께
  // 돌려보내서 placeholder가 아니라 "옛 인사이트 + 새 trigger CTA"를 보일 수 있게.
  const previous = await prisma.selfMapSynthesis.findFirst({ orderBy: { updatedAt: "desc" } });

  return NextResponse.json({
    ready: false,
    reason: "cache_miss",
    entryCount: entries.length,
    previousSynthesis: previous ? parseSynthesis(previous) : null,
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
