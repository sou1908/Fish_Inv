import { and, gte, lte, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, bad, body } from "@/lib/http";

export const runtime = "nodejs";

function dateFilter(col, searchParams) {
  const date = searchParams.get("date");
  const month = searchParams.get("month");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (date) return eq(col, date);
  if (month) return and(gte(col, `${month}-01`), lte(col, `${month}-31`));
  if (from && to) return and(gte(col, from), lte(col, to));
  return undefined;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const where = dateFilter(schema.productionRuns.date, searchParams);
    const q = db
      .select()
      .from(schema.productionRuns)
      .orderBy(desc(schema.productionRuns.date), desc(schema.productionRuns.id));
    const rows = where ? await q.where(where) : await q;
    return ok(rows);
  } catch (e) {
    return bad(e.message, 500);
  }
}

export async function POST(request) {
  try {
    const b = await body(request);
    if (!b.date || !b.productId) return bad("Date and product are required");
    const product = (
      await db.select().from(schema.products).where(eq(schema.products.id, b.productId))
    )[0];
    if (!product) return bad("Product not found", 404);

    const batches = b.batches ?? 1;
    const unitsProduced =
      b.unitsProduced != null ? b.unitsProduced : Math.round(batches * product.batchYield);

    const [row] = await db
      .insert(schema.productionRuns)
      .values({
        date: b.date,
        productId: b.productId,
        batches,
        unitsProduced,
        costPriceSnapshot: product.costPrice, // snapshot at save (§2.4)
        note: b.note || null,
      })
      .returning();
    return ok(row);
  } catch (e) {
    return bad(e.message, 500);
  }
}
