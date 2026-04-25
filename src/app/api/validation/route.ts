import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runValidationDesigner } from "@/lib/agents/validation-designer/run";

export async function GET() {
  const plans = await prisma.validationPlan.findMany({
    include: { problemCard: true, realityChecks: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const { problemCardId } = await req.json();

  const card = await prisma.problemCard.findUniqueOrThrow({ where: { id: problemCardId } });
  const selfMap = await prisma.selfMapEntry.findMany();

  let output;
  try {
    output = await runValidationDesigner({ card, selfMap });
  } catch (err) {
    console.error("[validation] Designer failed:", err);
    return NextResponse.json(
      {
        error: "Validation Designer failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  const plan = await prisma.validationPlan.create({
    data: {
      problemCardId,
      ideaDraft: output.ideaDraft,
      interviewQuestions: JSON.stringify(output.interviewQuestions),
      experimentMethod: output.experimentMethod,
      successSignals: output.successSignals,
      failureSignals: output.failureSignals,
      weeklySteps: JSON.stringify(output.weeklySteps),
    },
    include: { problemCard: true },
  });

  return NextResponse.json(plan);
}

export async function PATCH(req: NextRequest) {
  const { id, learnings, status } = await req.json();
  const plan = await prisma.validationPlan.update({
    where: { id },
    data: { ...(learnings !== undefined ? { learnings } : {}), ...(status ? { status } : {}) },
  });
  return NextResponse.json(plan);
}
