import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");
  const { pathname } = request.nextUrl;

  const authPages = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"];

  if (sessionCookie && authPages.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!sessionCookie && pathname.startsWith("/dashboard")) {
    const returnTo = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/sign-in?returnTo=${returnTo}`, request.url));
  }

  if (!sessionCookie && pathname === "/complete-profile") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/complete-profile",
  ],
};
