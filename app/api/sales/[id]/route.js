import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, bad, body } from "@/lib/http";
import { validateSale } from "@/lib/profit";
export const runtime = "nodejs";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const b = await body(request);
    const error = validateSale(b);
    if (error) return bad(error);
    const [existing] = await db.select().from(schema.sales).where(eq(schema.sales.id, Number(id)));
    if (!existing) return bad("Sale not found", 404);
    if (!Number.isSafeInteger(b.quantity * existing.unitPrice)) return bad("Quantity is too large");
    // Keep the selling price saved with the original entry.
    const [row] = await db.update(schema.sales).set({ quantity: b.quantity, totalCost: b.totalCost })
      .where(eq(schema.sales.id, Number(id))).returning();
    return ok(row);
  } catch (e) { return bad(e.message, 500); }
}
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const [row] = await db.delete(schema.sales).where(eq(schema.sales.id, Number(id))).returning();
    return row ? ok({ ok: true }) : bad("Sale not found", 404);
  } catch (e) { return bad(e.message, 500); }
}
