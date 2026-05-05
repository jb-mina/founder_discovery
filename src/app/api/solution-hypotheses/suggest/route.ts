import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runSolutionSuggester } from "@/lib/agents/solution-suggester/run";
import {
  getProblemFindings,
  listExistingSolutionStatements,
} from "@/lib/db/validation";

const bodySchema = z.object({
  problemCardId: z.string().min(1),
  // Optional user-supplied requirements/considerations. Soft-capped at 500
  // chars in the prompt builder; we cap at 1000 here so a longer raw input
  // doesn't bypass validation, but the prompt itself trims aggressively.
  userPrompt: z.string().trim().max(1000).optional(),
});

// POST /api/solution-hypotheses/suggest
// Returns 3 candidate solution statements. Does NOT save anything — the user
// picks one (and edits) before calling POST /api/solution-hypotheses.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { problemCardId, userPrompt } = parsed.data;

  const card = await prisma.problemCard.findUnique({ where: { id: problemCardId } });
  if (!card) return NextResponse.json({ error: "Problem not found" }, { status: 404 });

  const selfMap = await prisma.selfMapEntry.findMany();
  const existingSolutions = await listExistingSolutionStatements(problemCardId);
  const problemFindings = await getProblemFindings(problemCardId);

  try {
    const result = await runSolutionSuggester({
      card,
      selfMap,
      existingSolutions,
      problemFindings,
      userPrompt: userPrompt && userPrompt.length > 0 ? userPrompt : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[solution-hypotheses/suggest] Suggester failed:", err);
    return NextResponse.json(
      {
        error: "Solution Suggester failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
