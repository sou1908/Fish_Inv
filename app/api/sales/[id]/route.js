import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, bad, body } from "@/lib/http";

export const runtime = "nodejs";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const b = await body(request);
    const patch = {};
    for (const k of ["quantity", "unitPrice", "paymentMode", "time"]) {
      if (k in b) patch[k] = b[k];
    }
    const [row] = await db
      .update(schema.sales)
      .set(patch)
      .where(eq(schema.sales.id, Number(id)))
      .returning();
    return ok(row);
  } catch (e) {
    return bad(e.message, 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.delete(schema.sales).where(eq(schema.sales.id, Number(id)));
    return ok({ ok: true });
  } catch (e) {
    return bad(e.message, 500);
  }
}
