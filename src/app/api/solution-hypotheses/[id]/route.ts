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
  const updated = await updateSolutionHypothesisStatus(id, parsed.data.status);
  return NextResponse.json(updated);
}
