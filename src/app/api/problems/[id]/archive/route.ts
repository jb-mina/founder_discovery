import { NextRequest, NextResponse } from "next/server";
import { archiveProblemCard } from "@/lib/db/problem-cards";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const card = await archiveProblemCard(id);
    return NextResponse.json(card);
  } catch {
    return NextResponse.json(
      { error: "ProblemCard not found" },
      { status: 404 },
    );
  }
}
