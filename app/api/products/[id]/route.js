import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, bad, body } from "@/lib/http";
import { today } from "@/lib/date";
import { validAmount } from "@/lib/profit";

export const runtime = "nodejs";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const pid = Number(id);
    const b = await body(request);
    if ("name" in b && (typeof b.name !== "string" || !b.name.trim())) return bad("Name is required");
    if ("sellingPrice" in b && !validAmount(b.sellingPrice)) return bad("Invalid selling price");
    if ("isActive" in b && typeof b.isActive !== "boolean") return bad("Invalid active status");
    const existing = (
      await db.select().from(schema.products).where(eq(schema.products.id, pid))
    )[0];
    if (!existing) return bad("Not found", 404);

    const patch = {};
    for (const k of ["name", "sellingPrice", "isActive"]) {
      if (k in b) patch[k] = b[k];
    }
    if (patch.name) patch.name = patch.name.trim();
    if (!Object.keys(patch).length) return bad("No product changes supplied");
    const [row] = await db
      .update(schema.products)
      .set(patch)
      .where(eq(schema.products.id, pid))
      .returning();

    // Snapshot a new price-history row when a price actually changes (§2.3).
    const priceChanged =
      ("costPrice" in patch && patch.costPrice !== existing.costPrice) ||
      ("sellingPrice" in patch && patch.sellingPrice !== existing.sellingPrice);
    if (priceChanged) {
      await db.insert(schema.productPriceHistory).values({
        productId: pid,
        costPrice: row.costPrice,
        sellingPrice: row.sellingPrice,
        effectiveFrom: today(),
      });
    }
    return ok(row);
  } catch (e) {
    return bad(e.message, 500);
  }
}

// Hard delete. Past sales/production keep their snapshotted prices; they'll
// just show "—" for the product name. To keep history intact instead, deactivate
// the product (uncheck "Active") rather than deleting.
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.delete(schema.products).where(eq(schema.products.id, Number(id)));
    return ok({ ok: true });
  } catch (e) {
    return bad(e.message, 500);
  }
}
