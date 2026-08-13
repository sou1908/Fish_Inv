import { and, gte, lte, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, bad, body } from "@/lib/http";

export const runtime = "nodejs";

function dateFilter(col, searchParams) {
  const month = searchParams.get("month");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (month) return and(gte(col, `${month}-01`), lte(col, `${month}-31`));
  if (from && to) return and(gte(col, from), lte(col, to));
  return undefined;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const where = dateFilter(schema.purchases.date, searchParams);
    const q = db.select().from(schema.purchases).orderBy(desc(schema.purchases.date), desc(schema.purchases.id));
    const rows = where ? await q.where(where) : await q;
    return ok(rows);
  } catch (e) {
    return bad(e.message, 500);
  }
}

export async function POST(request) {
  try {
    const b = await body(request);
    if (!b.date) return bad("Date is required");
    const items = Array.isArray(b.items) ? b.items : [];
    const itemsTotal = items.reduce((s, it) => s + (it.amount || 0), 0);
    const total = itemsTotal + (b.otherCharges || 0);

    const [row] = await db
      .insert(schema.purchases)
      .values({
        date: b.date,
        supplier: b.supplier || null,
        paymentMode: b.paymentMode || "cash",
        items,
        otherCharges: b.otherCharges || 0,
        total,
        note: b.note || null,
      })
      .returning();

    // On save: currentStock += quantity, lastRate = rate (§2.2)
    for (const it of items) {
      if (!it.rawMaterialId) continue;
      await db
        .update(schema.rawMaterials)
        .set({
          currentStock: sql`${schema.rawMaterials.currentStock} + ${it.quantity || 0}`,
          lastRate: it.rate || 0,
        })
        .where(eq(schema.rawMaterials.id, it.rawMaterialId));
    }
    return ok(row);
  } catch (e) {
    return bad(e.message, 500);
  }
}
