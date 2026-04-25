import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { updateSolutionHypothesisStatus } from "@/lib/db/validation";

const patchSchema = z.object({
  status: z.enum(["active", "shelved", "confirmed", "broken"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { status } = parsed.data;

  // Single-active invariant — when activating a solution, demote any sibling
  // active solutions for the same problem to shelved.
  if (status === "active") {
    const target = await prisma.solutionHypothesis.findUnique({
      where: { id },
      select: { problemCardId: true },
    });
    if (target) {
      await prisma.solutionHypothesis.updateMany({
        where: {
          problemCardId: target.problemCardId,
          status: "active",
          NOT: { id },
        },
        data: { status: "shelved" },
      });
    }
  }

  const updated = await updateSolutionHypothesisStatus(id, status);
  return NextResponse.json(updated);
}
