import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/invite-code";
import { sendInviteEmail } from "@/lib/email/resend";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const invite = await prisma.inviteRequest.findUnique({ where: { id } });
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let code = invite.code ?? generateInviteCode();
  if (!invite.code) {
    // Mint a new code, retry once on the rare unique-collision.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await prisma.inviteRequest.update({
          where: { id },
          data: { code },
        });
        break;
      } catch (err) {
        if (attempt === 1) throw err;
        code = generateInviteCode();
      }
    }
  }

  try {
    await sendInviteEmail({ to: invite.email, code });
  } catch (err) {
    console.error("[admin/invites/approve] email failed:", err);
    return NextResponse.json(
      {
        error: "Email send failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  const updated = await prisma.inviteRequest.update({
    where: { id },
    data: {
      status: "approved",
      approvedAt: invite.approvedAt ?? new Date(),
      emailSentAt: new Date(),
      revokedAt: null,
    },
  });
  return NextResponse.json(updated);
}
