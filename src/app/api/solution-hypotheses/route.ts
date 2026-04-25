import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { designSolutionAxes } from "@/lib/agents/validation-designer/run";
import {
  createSolutionHypothesisWithAxes,
  getProblemFindings,
} from "@/lib/db/validation";

const bodySchema = z.object({
  problemCardId: z.string().min(1),
  statement: z.string().min(10),
  source: z.enum(["manual", "ai_suggested"]).default("manual"),
});

// POST /api/solution-hypotheses
// Create a new SolutionHypothesis for a problem. The Validation Designer is
// called inline to produce fit + willingness prescriptions, and the create
// happens in a single transaction.
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { problemCardId, statement, source } = parsed.data;

  const card = await prisma.problemCard.findUnique({ where: { id: problemCardId } });
  if (!card) return NextResponse.json({ error: "Problem not found" }, { status: 404 });

  const selfMap = await prisma.selfMapEntry.findMany();
  const problemFindings = await getProblemFindings(problemCardId);

  let designed;
  try {
    designed = await designSolutionAxes({ card, selfMap, solutionStatement: statement, problemFindings });
  } catch (err) {
    console.error("[solution-hypotheses] Designer failed:", err);
    return NextResponse.json(
      {
        error: "Validation Designer failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  const created = await createSolutionHypothesisWithAxes({
    problemCardId,
    statement,
    source,
    prescriptions: designed.hypotheses,
  });

  return NextResponse.json(created);
}
