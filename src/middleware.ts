import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_ACCOUNT_PATHS = [
  "/account/login",
  "/account/forgot-password",
  "/account/reset-password",
];

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  if (host.startsWith("www.")) {
    const cleanHost = host.replace(/^www\./i, "");
    const url = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, `https://${cleanHost}`);
    return NextResponse.redirect(url, 301);
  }

  const { pathname } = request.nextUrl;
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

  if (!secret) {
    // Fail closed if secrets are not configured in environment
    if (pathname.startsWith("/admin") || pathname.startsWith("/account") || pathname === "/uat") {
      return new NextResponse("Server authentication configuration missing.", { status: 500 });
    }
  }

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
    const allowedRoles = ["owner", "manager", "super_admin", "read_only"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL("/account", request.url));
    }

    // 1b. Exclude /admin from search engine indexing (§3.5)
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
