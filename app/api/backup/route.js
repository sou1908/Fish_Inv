import { getTableName, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { bad, ok } from "@/lib/http";
import { BACKUP_TABLES, MAX_BACKUP_BYTES, makeBackup, validateBackup } from "@/lib/backup";

export const runtime = "nodejs";

export async function GET() {
  try {
    const tables = await db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`);
      const data = {};
      for (const name of BACKUP_TABLES) data[name] = await tx.select().from(schema[name]);
      return data;
    });
    return new Response(JSON.stringify(makeBackup(tables)), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="fish-inv-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) { return bad(e.message, 500); }
}

export async function POST(request) {
  const declaredSize = Number(request.headers.get("content-length"));
  if (declaredSize > MAX_BACKUP_BYTES) return bad("Backup exceeds 50 MB", 413);
  let tables;
  try {
    const contents = await request.text();
    if (Buffer.byteLength(contents, "utf8") > MAX_BACKUP_BYTES) return bad("Backup exceeds 50 MB", 413);
    tables = validateBackup(JSON.parse(contents));
  } catch (e) { return bad(e instanceof SyntaxError ? "Invalid JSON file" : e.message); }

  try {
    await db.transaction(async (tx) => {
      // Block writes during replacement; rollback restores all old rows if any step fails.
      await tx.execute(sql.raw("LOCK TABLE " + BACKUP_TABLES.map((name) => `public.${getTableName(schema[name])}`).join(", ") + " IN ACCESS EXCLUSIVE MODE"));
      for (const name of [...BACKUP_TABLES].reverse()) await tx.delete(schema[name]);
      for (const name of BACKUP_TABLES) {
        const rows = tables[name];
        for (let index = 0; index < rows.length; index += 200) {
          await tx.insert(schema[name]).values(rows.slice(index, index + 200));
        }
      }
      // Explicit IDs do not advance PostgreSQL serial sequences.
      for (const name of BACKUP_TABLES) {
        if (!schema[name].id || name === "settings") continue;
        const tableName = getTableName(schema[name]);
        await tx.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('public.${tableName}', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM public.${tableName}`));
      }
    });
    return ok({ restored: true });
  } catch (e) { return bad(`Restore failed; current data was kept. ${e.message}`, 500); }
}
