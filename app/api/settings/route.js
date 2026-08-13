import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, bad, body } from "@/lib/http";

export const runtime = "nodejs";

async function ensureSettings() {
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.id, 1));
  if (rows.length) return rows[0];
  const [row] = await db.insert(schema.settings).values({ id: 1 }).returning();
  return row;
}

export async function GET() {
  try {
    const s = await ensureSettings();
    return ok(s);
  } catch (e) {
    return bad(e.message, 500);
  }
}

export async function PUT(request) {
  try {
    await ensureSettings();
    const patch = await body(request);
    delete patch.id;
    const [row] = await db
      .update(schema.settings)
      .set(patch)
      .where(eq(schema.settings.id, 1))
      .returning();
    return ok(row);
  } catch (e) {
    return bad(e.message, 500);
  }
}
