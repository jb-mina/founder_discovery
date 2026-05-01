import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isProblemCategory } from "@/lib/problem-categories";

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
