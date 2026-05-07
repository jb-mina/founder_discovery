import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getAllPersonaConfigs,
  isPersona,
  setPersonaConfig,
} from "@/lib/db/reality-check-config";

export async function GET() {
  const configs = await getAllPersonaConfigs();
  return NextResponse.json({ configs });
}

const patchSchema = z.object({
  persona: z.string().min(1),
  vendor: z.enum(["anthropic", "openrouter"]),
  model: z.string().min(1),
});

export async function PATCH(req: NextRequest) {
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { persona, vendor, model } = parsed.data;
  if (!isPersona(persona)) {
    return NextResponse.json({ error: `unknown persona '${persona}'` }, { status: 400 });
  }
  try {
    const result = await setPersonaConfig(persona, vendor, model);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
