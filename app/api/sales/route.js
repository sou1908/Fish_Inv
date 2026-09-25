import { and, gte, lte, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, bad, body } from "@/lib/http";
import { validDate, validateSale } from "@/lib/profit";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams: p } = new URL(request.url);
    let from = p.get("from"), to = p.get("to");
    if (p.has("date")) from = to = p.get("date");
    if (p.has("month")) {
      const month = p.get("month");
      if (!/^\d{4}-\d{2}$/.test(month) || !validDate(month + "-01")) return bad("Invalid month");
      from = month + "-01";
      const [y, m] = month.split("-").map(Number);
      to = month + "-" + new Date(Date.UTC(y, m, 0)).getUTCDate();
    }
    if ((from !== null || to !== null) && (!validDate(from) || !validDate(to) || from > to)) return bad("Enter a valid date range");
    const rows = await db.select().from(schema.sales)
      .where(from ? and(gte(schema.sales.date, from), lte(schema.sales.date, to)) : undefined)
      .orderBy(desc(schema.sales.date), desc(schema.sales.id));
    return ok(rows);
  } catch (e) { return bad(e.message, 500); }
}

export async function POST(request) {
  try {
    const b = await body(request);
    if (!validDate(b.date) || !Number.isInteger(b.productId) || b.productId <= 0) return bad("Valid date and product are required");
    const error = validateSale(b);
    if (error) return bad(error);
    const result = await db.transaction(async (tx) => {
      // Serialize creates for this product/day, including requests from other tabs.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${b.date}), ${b.productId})`);
      const [product] = await tx.select().from(schema.products).where(eq(schema.products.id, b.productId));
      if (!product || !product.isActive) return { error: "Active product not found", status: 404 };
      const [existing] = await tx.select().from(schema.sales).where(and(eq(schema.sales.date, b.date), eq(schema.sales.productId, b.productId)));
      if (existing) return { error: "This product already has sales for this date. Edit the recorded entry.", status: 409 };
      if (!Number.isSafeInteger(b.quantity * product.sellingPrice)) return { error: "Quantity is too large", status: 400 };
      const [row] = await tx.insert(schema.sales).values({
        date: b.date, productId: product.id, quantity: b.quantity,
        unitPrice: product.sellingPrice, totalCost: b.totalCost, costPriceSnapshot: 0,
      }).returning();
      return { row };
    });
    return result.error ? bad(result.error, result.status) : ok(result.row);
  } catch (e) { return bad(e.message, 500); }
}
