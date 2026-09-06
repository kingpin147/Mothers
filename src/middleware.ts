import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_ACCOUNT_PATHS = [
  "/account/login",
  "/account/forgot-password",
  "/account/reset-password",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "f47ac10b58cc4372a5670e02b2c3d4793f18e9a2";

  const isSecure = request.url.startsWith("https://") || process.env.NODE_ENV === "production";

  // 1. Strict Server-Side Protection for /admin and /uat routes (§12)
  if (pathname.startsWith("/admin") || pathname === "/uat") {
    const token =
      (await getToken({ req: request, secret, secureCookie: isSecure })) ||
      (await getToken({ req: request, secret, secureCookie: !isSecure }));

    if (!token) {
      const loginUrl = new URL("/account/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = (token as any).role;
    const allowedRoles = ["owner", "manager", "host", "super_admin", "read_only"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL("/account", request.url));
    }

    // 1b. Enforce 12-hour admin session expiry (§3.3)
    const tokenIat = (token as any).iat;
    if (tokenIat && (Date.now() / 1000 - tokenIat) > 12 * 60 * 60) {
      const loginUrl = new URL("/account/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      loginUrl.searchParams.set("session_expired", "1");
      return NextResponse.redirect(loginUrl);
    }

    // 1c. Exclude /admin from search engine indexing (§3.5)
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // 2. Strict Server-Side Protection for /account routes
  if (pathname.startsWith("/account")) {
    const isPublicAccountPath = PUBLIC_ACCOUNT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
    if (!isPublicAccountPath) {
      const token =
        (await getToken({ req: request, secret, secureCookie: isSecure })) ||
        (await getToken({ req: request, secret, secureCookie: !isSecure }));

      if (!token) {
        const loginUrl = new URL("/account/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // 3. Secret Header Protection for Cron Endpoints (§13)
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
  matcher: ["/admin/:path*", "/account/:path*", "/api/cron/:path*", "/uat"],
};

