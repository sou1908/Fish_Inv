import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, bad, body } from "@/lib/http";
import { today } from "@/lib/date";
import { validAmount } from "@/lib/profit";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await db.select().from(schema.products).orderBy(desc(schema.products.id));
    return ok(rows);
  } catch (e) {
    return bad(e.message, 500);
  }
}

export async function POST(request) {
  try {
    const b = await body(request);
    if (typeof b.name !== "string" || !b.name.trim()) return bad("Name is required");
    if (!validAmount(b.sellingPrice)) return bad("Valid selling price is required");
    const [row] = await db
      .insert(schema.products)
      .values({
        name: b.name.trim(),
        sellingPrice: b.sellingPrice,
      })
      .returning();
    // seed price history
    await db.insert(schema.productPriceHistory).values({
      productId: row.id,
      costPrice: row.costPrice,
      sellingPrice: row.sellingPrice,
      effectiveFrom: today(),
    });
    return ok(row);
  } catch (e) {
    return bad(e.message, 500);
  }
}
