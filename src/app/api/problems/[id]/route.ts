import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isProblemCategory } from "@/lib/problem-categories";
import {
  getProblemCardDeletionPreview,
  hardDeleteProblemCard,
} from "@/lib/db/problem-cards";

const EDITABLE_FIELDS = [
  "title",
  "who",
  "when",
  "why",
  "painPoints",
  "alternatives",
  "source",
  "sourceUrl",
  "tags",
  "stage",
  "category",
] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const preview = await getProblemCardDeletionPreview(id);
  if (!preview) {
    return NextResponse.json({ error: "ProblemCard not found" }, { status: 404 });
  }
  return NextResponse.json(preview);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, string> = {};
  for (const key of EDITABLE_FIELDS) {
    if (typeof body[key] === "string") data[key] = body[key];
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No editable fields provided" }, { status: 400 });
  }

  if ("category" in data) {
    const next = data.category;
    if (next !== "" && !isProblemCategory(next)) {
      const existing = await prisma.problemCard.findUnique({
        where: { id },
        select: { category: true },
      });
      if (!existing || next !== existing.category) {
        return NextResponse.json(
          { error: "Invalid category. Must be one of the allowed enum values or empty string." },
          { status: 400 },
        );
      }
    }
  }

  const card = await prisma.problemCard.update({ where: { id }, data });
  return NextResponse.json(card);
}

// Hard delete is gated behind the archive state — the UI surfaces it only on
// the archive page, and this guard ensures direct API callers can't bypass
// the soft step. Cascade FKs handle dependent rows (FitEvaluation, Hypothesis,
// SolutionHypothesis → RealityCheck/OnePager).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const preview = await getProblemCardDeletionPreview(id);
  if (!preview) {
    return NextResponse.json({ error: "ProblemCard not found" }, { status: 404 });
  }
  if (!preview.archivedAt) {
    return NextResponse.json(
      { error: "ProblemCard must be archived before permanent deletion" },
      { status: 409 },
    );
  }
  await hardDeleteProblemCard(id);
  return NextResponse.json({ ok: true });
}
