import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { BACKUP_TABLES, MAX_BACKUP_BYTES, makeBackup, validateBackup } from "../lib/backup.js";

function fixture() {
  const tables = Object.fromEntries(BACKUP_TABLES.map((name) => [name, []]));
  tables.settings.push({ id: 1, businessName: "Restored", logoDataUrl: null,
    currency: "₹", salesMode: "quick", wastageThresholdPercent: 10,
    targetMarginPercent: 40, operatingDaysPerMonth: 26, allocatedBudget: 300000 });
  tables.products.push({ id: 8, name: "Fish", category: null,
    sellingPrice: 10000, costPrice: 0, batchYield: 1, isActive: true });
  return makeBackup(tables);
}

async function makeRoute() {
  let current = Object.fromEntries(BACKUP_TABLES.map((name) => [name, []]));
  current.settings = [{ ...fixture().tables.settings[0], businessName: "Existing" }];
  let failOn = null;
  let commits = 0;
  const schema = Object.fromEntries(BACKUP_TABLES.map((name) =>
    [name, { name, id: ["settings", "dayCloses"].includes(name) ? null : {} }]));
  const db = {
    transaction: async (fn) => {
      const next = structuredClone(current);
      const tx = {
        execute: async () => {},
        select: () => ({ from: (table) => Promise.resolve(next[table.name]) }),
        delete: async (table) => { next[table.name] = []; },
        insert: (table) => ({ values: async (rows) => {
          if (table.name === failOn) throw new Error("simulated insert failure");
          next[table.name].push(...rows);
        } }),
      };
      const result = await fn(tx);
      current = next; commits++;
      return result;
    },
  };
  const sql = (strings) => strings.join("");
  sql.raw = (query) => query;
  let source = await readFile(new URL("../app/api/backup/route.js", import.meta.url), "utf8");
  source = source.replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
  const deps = { sql, db, schema, bad: (message, status = 400) => Response.json({ error: message }, { status }),
    ok: (value) => Response.json(value), getTableName: (table) => table.name,
    BACKUP_TABLES, MAX_BACKUP_BYTES, makeBackup, validateBackup };
  const route = new Function(...Object.keys(deps), `${source}\nreturn { GET, POST };`)(...Object.values(deps));
  return { ...route, state: () => current, fail: (tableName) => { failOn = tableName; }, commits: () => commits };
}

test("download includes all sections and restore replaces records and budget", async () => {
  const route = await makeRoute();
  const downloaded = await route.GET();
  assert.equal(downloaded.headers.get("Cache-Control"), "private, no-store");
  assert.equal((await downloaded.json()).tables.settings[0].businessName, "Existing");
  const result = await route.POST(new Request("http://localhost/api/backup", {
    method: "POST", body: JSON.stringify(fixture()),
  }));
  assert.equal(result.status, 200);
  assert.equal(route.state().settings[0].allocatedBudget, 300000);
  assert.equal(route.state().products[0].id, 8);
});

test("invalid JSON cannot start replacement and failed inserts roll back", async () => {
  const route = await makeRoute();
  const invalid = await route.POST(new Request("http://localhost/api/backup", { method: "POST", body: "{}" }));
  assert.equal(invalid.status, 400);
  assert.equal(route.commits(), 0);
  route.fail("products");
  const failed = await route.POST(new Request("http://localhost/api/backup", {
    method: "POST", body: JSON.stringify(fixture()),
  }));
  assert.equal(failed.status, 500);
  assert.match((await failed.json()).error, /current data was kept/);
  assert.equal(route.state().settings[0].businessName, "Existing");
  assert.equal(route.commits(), 0);
});
