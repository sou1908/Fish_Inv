import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, bad } from "@/lib/http";

export const runtime = "nodejs";

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.delete(schema.productionRuns).where(eq(schema.productionRuns.id, Number(id)));
    return ok({ ok: true });
  } catch (e) {
    return bad(e.message, 500);
  }
}
