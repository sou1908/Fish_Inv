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
    const where = dateFilter(schema.sales.date, searchParams);
    const q = db
      .select()
      .from(schema.sales)
      .orderBy(desc(schema.sales.date), desc(schema.sales.id));
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

    const unitPrice = b.unitPrice != null ? b.unitPrice : product.sellingPrice;
    const [row] = await db
      .insert(schema.sales)
      .values({
        date: b.date,
        productId: b.productId,
        quantity: b.quantity ?? 0,
        unitPrice,
        costPriceSnapshot: product.costPrice, // snapshot at save (§2.5)
        paymentMode: b.paymentMode || "cash",
        time: b.time || null,
      })
      .returning();
    return ok(row);
  } catch (e) {
    return bad(e.message, 500);
  }
}
