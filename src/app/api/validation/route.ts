import { NextResponse } from "next/server";
import { listProblemsInValidation } from "@/lib/db/validation";

export async function GET() {
  const problems = await listProblemsInValidation();
  return NextResponse.json(problems);
}
