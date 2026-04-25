import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateHypothesis } from "@/lib/db/validation";
import { VALIDATION_METHODS } from "@/lib/agents/validation-designer/schema";

const patchSchema = z.object({
  status: z.enum(["not_started", "in_progress", "broken", "confirmed"]).optional(),
  findings: z.string().optional(),
  prescribedMethods: z.array(z.enum(VALIDATION_METHODS)).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await updateHypothesis(id, parsed.data);
  return NextResponse.json(updated);
}
