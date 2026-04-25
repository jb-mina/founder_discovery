import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email().max(254),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();

  // Idempotent — repeat submissions of the same email don't error so spam
  // probing for "is this email registered" doesn't get a meaningful signal.
  const existing = await prisma.inviteRequest.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ ok: true, status: existing.status });
  }

  await prisma.inviteRequest.create({ data: { email } });
  return NextResponse.json({ ok: true, status: "pending" });
}
