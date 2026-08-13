import { NextResponse } from "next/server";
import { COOKIE_NAME, sessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  if (!password || password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  const token = await sessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
