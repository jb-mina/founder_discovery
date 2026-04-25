import { NextResponse } from "next/server";
import { getProblemValidationView } from "@/lib/db/validation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ problemCardId: string }> },
) {
  const { problemCardId } = await params;
  const view = await getProblemValidationView(problemCardId);
  if (!view) {
    return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  }
  return NextResponse.json(view);
}
