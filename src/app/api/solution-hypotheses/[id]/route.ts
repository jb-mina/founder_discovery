import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
  // Multiple solutions may be active in parallel — the user wants to compare
  // prescribed methods and Reality Check across candidates before deciding
  // which to actually pursue. Demoting siblings here would force a one-at-a-
  // time flow that doesn't match the exploration step.
  const updated = await updateSolutionHypothesisStatus(id, parsed.data.status);
  return NextResponse.json(updated);
}
