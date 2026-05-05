import { NextRequest, NextResponse } from "next/server";
import { restoreProblemCard } from "@/lib/db/problem-cards";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const card = await restoreProblemCard(id);
    return NextResponse.json(card);
  } catch {
    return NextResponse.json(
      { error: "ProblemCard not found" },
      { status: 404 },
    );
  }
}
