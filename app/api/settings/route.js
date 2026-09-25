import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ok, bad, body } from "@/lib/http";
import { validAmount } from "@/lib/profit";

export const runtime = "nodejs";

async function ensureSettings() {
  const rows = await db.select().from(schema.settings).where(eq(schema.settings.id, 1));
  if (rows.length) return rows[0];
  const [row] = await db.insert(schema.settings).values({ id: 1 }).returning();
  return row;
}

export async function GET() {
  try {
    const s = await ensureSettings();
    return ok(s);
  } catch (e) {
    return bad(e.message, 500);
  }
}

export async function PUT(request) {
  try {
    const input = await body(request);
    if (!input || typeof input !== "object" || Array.isArray(input)) return bad("Invalid settings");
    if (Object.keys(input).some((key) => !["businessName", "allocatedBudget"].includes(key))) return bad("Unsupported setting");
    if ("businessName" in input && (typeof input.businessName !== "string" || !input.businessName.trim())) return bad("Business name is required");
    if ("allocatedBudget" in input && !validAmount(input.allocatedBudget)) return bad("Enter a valid non-negative budget");
    const patch = { ...input };
    if (patch.businessName) patch.businessName = patch.businessName.trim();
    if (!Object.keys(patch).length) return bad("No settings supplied");
    await ensureSettings();
    const [row] = await db
      .update(schema.settings)
      .set(patch)
      .where(eq(schema.settings.id, 1))
      .returning();
    return ok(row);
  } catch (e) {
    return bad(e.message, 500);
  }
}
