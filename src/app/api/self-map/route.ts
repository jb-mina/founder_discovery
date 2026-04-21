import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const entries = await prisma.selfMapEntry.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(entries);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.selfMapEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
