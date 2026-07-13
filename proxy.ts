import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");
  const { pathname } = request.nextUrl;

  const authPages = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"];

  if (sessionCookie && authPages.includes(pathname)) {
    const res = NextResponse.redirect(new URL("/dashboard", request.url));
    applySecurityHeaders(res);
    return res;
  }

  if (!sessionCookie && pathname.startsWith("/dashboard")) {
    const returnTo = encodeURIComponent(pathname);
    const res = NextResponse.redirect(new URL(`/sign-in?returnTo=${returnTo}`, request.url));
    applySecurityHeaders(res);
    return res;
  }

  if (!sessionCookie && pathname === "/complete-profile") {
    const res = NextResponse.redirect(new URL("/sign-in", request.url));
    applySecurityHeaders(res);
    return res;
  }

  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|assets).*)",
  ],
};
