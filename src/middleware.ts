import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Strict Server-Side Protection for /admin routes (§12)
  if (pathname.startsWith("/admin")) {
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "f47ac10b58cc4372a5670e02b2c3d4793f18e9a2";
    const token = await getToken({
      req: request,
      secret,
    });

    if (!token) {
      const loginUrl = new URL("/account/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = (token as any).role;
    const allowedRoles = ["owner", "manager", "host"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL("/account", request.url));
    }
  }

  // 2. Secret Header Protection for Cron Endpoints (§13)
  if (pathname.startsWith("/api/cron")) {
    const authHeader = request.headers.get("authorization") || request.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || (authHeader !== `Bearer ${expectedSecret}` && authHeader !== expectedSecret)) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized cron trigger" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/cron/:path*"],
};
