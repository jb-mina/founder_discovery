import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const source = searchParams.get("source");
  const q = searchParams.get("q");

  const cards = await prisma.problemCard.findMany({
    where: {
      hypotheses: { none: {} },
      solutionHypotheses: { none: {} },
      ...(category ? { category } : {}),
      ...(source ? { source } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { who: { contains: q } }, { painPoints: { contains: q } }] } : {}),
    },
    include: { fitEvaluations: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(cards);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const card = await prisma.problemCard.create({ data: body });
  return NextResponse.json(card);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.problemCard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
