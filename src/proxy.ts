import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login"];
const PUBLIC_API_PATHS = ["/api/auth", "/api/invite-request"];

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const auth = request.cookies.get("auth")?.value ?? null;
  const sitePassword = process.env.SITE_PASSWORD;
  const isAdmin = !!auth && !!sitePassword && auth === sitePassword;

  // Admin paths require admin auth (the password value, not just any code)
  if (isAdminPath(pathname)) {
    if (isAdmin) return NextResponse.next();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Public paths: pass through
  if (PUBLIC_PATHS.includes(pathname) || PUBLIC_API_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Otherwise, require any auth cookie
  if (!auth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
