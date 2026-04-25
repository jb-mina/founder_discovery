import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function setAuthCookie(res: NextResponse, value: string) {
  res.cookies.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : null;
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : null;

  // Path 1: admin/Mina via SITE_PASSWORD
  if (password && process.env.SITE_PASSWORD && password === process.env.SITE_PASSWORD) {
    const res = NextResponse.json({ ok: true, role: "admin" });
    setAuthCookie(res, password);
    return res;
  }

  // Path 2: invitee via code (must be approved — revoked / rejected / pending denied)
  if (code) {
    const invite = await prisma.inviteRequest.findUnique({ where: { code } });
    if (invite && invite.status === "approved") {
      await prisma.inviteRequest.update({
        where: { id: invite.id },
        data: { lastUsedAt: new Date() },
      });
      const res = NextResponse.json({ ok: true, role: "invitee" });
      setAuthCookie(res, code);
      return res;
    }
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
