import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { VALIDATION_METHODS } from "@/lib/agents/validation-designer/schema";
import { runMethodCoach } from "@/lib/agents/method-coach/run";
import {
  getMethodGuide,
  toMethodGuideView,
  upsertMethodGuide,
} from "@/lib/db/method-guides";

const querySchema = z.object({
  method: z.enum(VALIDATION_METHODS),
});

const postSchema = z.object({
  method: z.enum(VALIDATION_METHODS),
  regenerate: z.boolean().optional(),
});

// GET: return cached guide if present (lazy — no generation here).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ method: url.searchParams.get("method") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid method" }, { status: 400 });
  }
  const guide = await getMethodGuide(id, parsed.data.method);
  return NextResponse.json(guide ? toMethodGuideView(guide) : null);
}

// POST: generate (or regenerate) and persist. Idempotent for non-regenerate
// callers — returns existing guide if one is already cached.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { method, regenerate } = parsed.data;

  if (!regenerate) {
    const existing = await getMethodGuide(id, method);
    if (existing) return NextResponse.json(toMethodGuideView(existing));
  }

  const hypothesis = await prisma.hypothesis.findUnique({
    where: { id },
    include: {
      problemCard: true,
      solutionHypothesis: { include: { problemCard: true } },
    },
  });
  if (!hypothesis) {
    return NextResponse.json({ error: "Hypothesis not found" }, { status: 404 });
  }

  // Resolve the ProblemCard whether this hypothesis is problem-level
  // (existence/severity) or solution-level (fit/willingness).
  const card =
    hypothesis.problemCard ?? hypothesis.solutionHypothesis?.problemCard ?? null;
  if (!card) {
    return NextResponse.json({ error: "Problem card not resolvable" }, { status: 422 });
  }

  const output = await runMethodCoach({
    card,
    axis: hypothesis.axis as Parameters<typeof runMethodCoach>[0]["axis"],
    method,
    successSignals: hypothesis.successSignals,
    failureSignals: hypothesis.failureSignals,
    findings: hypothesis.findings,
    solution: hypothesis.solutionHypothesis
      ? { statement: hypothesis.solutionHypothesis.statement }
      : null,
  });

  const saved = await upsertMethodGuide(id, method, output);
  return NextResponse.json(toMethodGuideView(saved));
}
