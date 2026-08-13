import { and, gte, lte, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, bad, body } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const month = searchParams.get("month");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (date) {
      const rows = await db
        .select()
        .from(schema.dayCloses)
        .where(eq(schema.dayCloses.date, date));
      return ok(rows[0] || null);
    }
    let where;
    if (month) where = and(gte(schema.dayCloses.date, `${month}-01`), lte(schema.dayCloses.date, `${month}-31`));
    else if (from && to) where = and(gte(schema.dayCloses.date, from), lte(schema.dayCloses.date, to));

    const q = db.select().from(schema.dayCloses).orderBy(desc(schema.dayCloses.date));
    const rows = where ? await q.where(where) : await q;
    return ok(rows);
  } catch (e) {
    return bad(e.message, 500);
  }
}

// Upsert the day-close record (keyed by date). isLocked drives the one-tap close.
export async function PUT(request) {
  try {
    const b = await body(request);
    if (!b.date) return bad("Date is required");
    const values = {
      date: b.date,
      entries: Array.isArray(b.entries) ? b.entries : [],
      overheads: Array.isArray(b.overheads) ? b.overheads : [],
      isLocked: !!b.isLocked,
      closedAt: b.isLocked ? new Date() : null,
    };
    const [row] = await db
      .insert(schema.dayCloses)
      .values(values)
      .onConflictDoUpdate({ target: schema.dayCloses.date, set: values })
      .returning();
    return ok(row);
  } catch (e) {
    return bad(e.message, 500);
  }
}
