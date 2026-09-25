import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as profit from "../lib/profit.js";

// Exercise the real route handlers against an in-memory database double.
// No connection to the configured (possibly production) database is made.
async function routes() {
  const tables = {
    products: [{ id: 1, name: "Fish", sellingPrice: 10000, costPrice: 9999, isActive: true }],
    sales: [],
  };
  const schema = Object.fromEntries(Object.keys(tables).map((name) => [name,
    new Proxy({ name }, { get: (obj, key) => key === "name" ? obj.name : key }),
  ]));
  const db = {
    execute: async () => {},
    transaction: async (fn) => fn(db),
    select: () => ({ from: (table) => {
      let filter = () => true;
      const query = {
        where: (fn) => { filter = fn || filter; return query; },
        orderBy: () => query,
        then: (resolve, reject) => Promise.resolve(tables[table.name].filter(filter)).then(resolve, reject),
      };
      return query;
    } }),
    insert: (table) => ({ values: (value) => ({ returning: async () => {
      const row = { id: tables[table.name].length + 1, ...value };
      tables[table.name].push(row); return [row];
    } }) }),
    update: (table) => ({ set: (patch) => ({ where: (filter) => ({ returning: async () => {
      const rows = tables[table.name].filter(filter);
      rows.forEach((row) => Object.assign(row, patch)); return rows;
    } }) }) }),
    delete: (table) => ({ where: (filter) => ({ returning: async () => {
      const rows = tables[table.name].filter(filter);
      tables[table.name] = tables[table.name].filter((r) => !filter(r)); return rows;
    } }) }),
  };
  const deps = {
    ...profit, db, schema,
    eq: (key, value) => (row) => row[key] === value,
    gte: (key, value) => (row) => row[key] >= value,
    lte: (key, value) => (row) => row[key] <= value,
    and: (...conditions) => (row) => conditions.every((fn) => fn(row)),
    desc: (key) => key, sql: () => ({}),
    ok: (value) => Response.json(value),
    bad: (error, status = 400) => Response.json({ error }, { status }),
    body: (request) => request.json(),
  };
  async function load(path, exports) {
    let source = await readFile(new URL(path, import.meta.url), "utf8");
    source = source.replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
    return new Function(...Object.keys(deps), `${source}\nreturn { ${exports} };`)(...Object.values(deps));
  }
  return { tables, ...await load("../app/api/sales/route.js", "GET, POST"), ...await load("../app/api/sales/[id]/route.js", "PUT, DELETE") };
}
const request = (data) => new Request("http://localhost/api/sales", { method: "POST", body: JSON.stringify(data) });
const entry = { date: "2026-09-25", productId: 1, quantity: 10, totalCost: 70000 };

test("save, reject duplicates, edit with saved price, and delete", async () => {
  const api = await routes();
  const saved = await (await api.POST(request({ ...entry, unitPrice: 1 }))).json();
  assert.equal(saved.unitPrice, 10000);
  assert.equal(profit.saleTotals(saved).profit, 30000);
  assert.equal((await api.POST(request(entry))).status, 409);
  api.tables.products[0].sellingPrice = 20000;
  const edited = await (await api.PUT(request({ quantity: 0, totalCost: 5000 }), { params: Promise.resolve({ id: "1" }) })).json();
  assert.equal(edited.unitPrice, 10000);
  assert.equal(profit.saleTotals(edited).profit, -5000);
  assert.equal((await api.DELETE(null, { params: Promise.resolve({ id: "1" }) })).status, 200);
  assert.equal(api.tables.sales.length, 0);
});

test("invalid input and missing or inactive products are rejected", async () => {
  const api = await routes();
  for (const patch of [{ quantity: -1 }, { quantity: 1.5 }, { totalCost: null }, { date: "2026-02-30" }]) {
    assert.equal((await api.POST(request({ ...entry, ...patch }))).status, 400);
  }
  assert.equal((await api.POST(request({ ...entry, productId: 2 }))).status, 404);
  api.tables.products[0].isActive = false;
  assert.equal((await api.POST(request(entry))).status, 404);
  assert.equal(api.tables.sales.length, 0);
});

test("February month filtering uses its actual last day", async () => {
  const api = await routes();
  api.tables.sales.push({ date: "2024-02-29" }, { date: "2024-03-01" });
  const result = await api.GET(new Request("http://localhost/api/sales?month=2024-02"));
  assert.deepEqual(await result.json(), [{ date: "2024-02-29" }]);
  assert.equal((await api.GET(new Request("http://localhost/api/sales?from=2026-09-25&to=2026-09-01"))).status, 400);
});
