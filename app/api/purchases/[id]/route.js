import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, bad } from "@/lib/http";

export const runtime = "nodejs";

// Deleting a purchase reverses the stock it added (subtracts each item's
// quantity back out). Last-rate isn't restored — it stays at the most recent value.
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const pid = Number(id);
    const rows = await db.select().from(schema.purchases).where(eq(schema.purchases.id, pid));
    const purchase = rows[0];
    if (!purchase) return bad("Not found", 404);

    for (const it of purchase.items || []) {
      if (!it.rawMaterialId) continue;
      await db
        .update(schema.rawMaterials)
        .set({
          currentStock: sql`${schema.rawMaterials.currentStock} - ${it.quantity || 0}`,
        })
        .where(eq(schema.rawMaterials.id, it.rawMaterialId));
    }
    await db.delete(schema.purchases).where(eq(schema.purchases.id, pid));
    return ok({ ok: true });
  } catch (e) {
    return bad(e.message, 500);
  }
}
