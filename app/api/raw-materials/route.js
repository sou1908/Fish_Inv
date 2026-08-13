import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, bad, body } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(schema.rawMaterials)
      .orderBy(asc(schema.rawMaterials.name));
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
      .insert(schema.rawMaterials)
      .values({
        name: b.name,
        category: b.category || "Other",
        unit: b.unit || "kg",
        currentStock: b.currentStock ?? 0,
        lastRate: b.lastRate ?? 0,
        reorderLevel: b.reorderLevel ?? 0,
        isPerishable: b.isPerishable ?? true,
      })
      .returning();
    return ok(row);
  } catch (e) {
    return bad(e.message, 500);
  }
}
