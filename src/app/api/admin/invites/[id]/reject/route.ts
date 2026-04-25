import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason ?? "" : "";

  const updated = await prisma.inviteRequest.update({
    where: { id },
    data: {
      status: "rejected",
      rejectedAt: new Date(),
      notes: reason ? `${reason}` : undefined,
    },
  });
  return NextResponse.json(updated);
}
