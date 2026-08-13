import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, bad, body } from "@/lib/http";
import { today } from "@/lib/date";

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
    if (!b.name) return bad("Name is required");
    const [row] = await db
      .insert(schema.products)
      .values({
        name: b.name,
        category: b.category || null,
        sellingPrice: b.sellingPrice ?? 0,
        costPrice: b.costPrice ?? 0,
        batchYield: b.batchYield ?? 1,
        isActive: b.isActive ?? true,
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
