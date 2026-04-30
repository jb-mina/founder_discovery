import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getOnePagerBySolution,
  upsertOnePagerSections,
  ONE_PAGER_SECTIONS,
} from "@/lib/db/one-pager";

const patchSchema = z
  .object(
    Object.fromEntries(
      ONE_PAGER_SECTIONS.map((k) => [k, z.string()]),
    ) as Record<(typeof ONE_PAGER_SECTIONS)[number], z.ZodString>,
  )
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one section field is required",
  });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ solutionHypothesisId: string }> },
) {
  const { solutionHypothesisId } = await params;
  const onePager = await getOnePagerBySolution(solutionHypothesisId);
  if (!onePager) {
    return NextResponse.json({ error: "OnePager not found" }, { status: 404 });
  }
  return NextResponse.json(onePager);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ solutionHypothesisId: string }> },
) {
  const { solutionHypothesisId } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const updated = await upsertOnePagerSections(
    solutionHypothesisId,
    parsed.data,
  );
  return NextResponse.json(updated);
}
