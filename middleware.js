import { NextResponse } from "next/server";
import { COOKIE_NAME, isValidToken } from "@/lib/auth";

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Public paths: the login page and its API.
  if (
    pathname === "/login" ||
    pathname === "/api/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const ok = await isValidToken(token);
  if (ok) return NextResponse.next();

  // API calls get 401; page navigations redirect to /login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
