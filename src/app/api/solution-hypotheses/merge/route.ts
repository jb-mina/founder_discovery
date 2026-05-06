import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runSolutionMerger } from "@/lib/agents/solution-suggester/run";
import {
  getProblemFindings,
  listExistingSolutionStatements,
} from "@/lib/db/validation";

const bodySchema = z.object({
  problemCardId: z.string().min(1),
  mergeFrom: z.array(z.string().trim().min(10)).min(2).max(3),
  userPrompt: z.string().trim().max(1000).optional(),
});

// POST /api/solution-hypotheses/merge
// Combine 2~3 candidate solution statements into a single merged candidate.
// Returns the merged candidate; does NOT save anything — the user reviews,
// edits, then calls POST /api/solution-hypotheses with source "ai_merged".
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { problemCardId, mergeFrom, userPrompt } = parsed.data;

  const card = await prisma.problemCard.findUnique({ where: { id: problemCardId } });
  if (!card) return NextResponse.json({ error: "Problem not found" }, { status: 404 });

  const selfMap = await prisma.selfMapEntry.findMany();
  const existingSolutions = await listExistingSolutionStatements(problemCardId);
  const problemFindings = await getProblemFindings(problemCardId);

  try {
    const result = await runSolutionMerger({
      card,
      selfMap,
      existingSolutions,
      problemFindings,
      userPrompt: userPrompt && userPrompt.length > 0 ? userPrompt : undefined,
      mergeFrom,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[solution-hypotheses/merge] Merger failed:", err);
    return NextResponse.json(
      {
        error: "Solution Merger failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
