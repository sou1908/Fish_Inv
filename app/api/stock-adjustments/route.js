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
    const where = dateFilter(schema.stockAdjustments.date, searchParams);
    const q = db
      .select()
      .from(schema.stockAdjustments)
      .orderBy(desc(schema.stockAdjustments.date), desc(schema.stockAdjustments.id));
    const rows = where ? await q.where(where) : await q;
    return ok(rows);
  } catch (e) {
    return bad(e.message, 500);
  }
}

export async function POST(request) {
  try {
    const b = await body(request);
    if (!b.date || !b.rawMaterialId) return bad("Date and material are required");
    const [row] = await db
      .insert(schema.stockAdjustments)
      .values({
        date: b.date,
        rawMaterialId: b.rawMaterialId,
        quantityDelta: b.quantityDelta ?? 0,
        reason: b.reason || "other",
        note: b.note || null,
      })
      .returning();
    // Apply the delta to live stock.
    await db
      .update(schema.rawMaterials)
      .set({
        currentStock: sql`${schema.rawMaterials.currentStock} + ${b.quantityDelta || 0}`,
      })
      .where(eq(schema.rawMaterials.id, b.rawMaterialId));
    return ok(row);
  } catch (e) {
    return bad(e.message, 500);
  }
}
