import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { designProblemAxes } from "@/lib/agents/validation-designer/run";
import { bootstrapProblemHypotheses } from "@/lib/db/validation";

// POST /api/problems/[id]/hypotheses
// Bootstrap (or refresh) the existence + severity hypotheses for a problem.
// Idempotent — re-running replaces prescriptions but preserves status/findings.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const card = await prisma.problemCard.findUnique({ where: { id } });
  if (!card) return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  const selfMap = await prisma.selfMapEntry.findMany();

  let designed;
  try {
    designed = await designProblemAxes(card, selfMap);
  } catch (err) {
    console.error("[problems/hypotheses] Designer failed:", err);
    return NextResponse.json(
      {
        error: "Validation Designer failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  const hypotheses = await bootstrapProblemHypotheses(id, designed.hypotheses);
  return NextResponse.json({ hypotheses });
}
