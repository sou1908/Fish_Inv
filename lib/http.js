import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function ok(data) {
  return NextResponse.json(data ?? { ok: true });
}

export function bad(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function body(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
