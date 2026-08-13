import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, ssl: "require" });

// paise helper
const p = (rupees) => Math.round(rupees * 100);
const today = new Date().toISOString().slice(0, 10);

async function run() {
  console.log("Seeding demo data…");

  await sql`INSERT INTO settings (id, business_name) VALUES (1, 'Raju Fish Snacks')
    ON CONFLICT (id) DO NOTHING`;

  const products = [
    ["Fish Momo", "Momo", p(15), p(8), 40],
    ["Fish Cutlet", "Cutlet", p(20), p(11), 30],
    ["Fish Roll", "Roll", p(25), p(14), 24],
    ["Fish Pakora", "Pakora", p(10), p(5), 50],
  ];
  for (const [name, category, sp, cp, yld] of products) {
    const rows = await sql`INSERT INTO products (name, category, selling_price, cost_price, batch_yield)
      VALUES (${name}, ${category}, ${sp}, ${cp}, ${yld}) RETURNING id`;
    await sql`INSERT INTO product_price_history (product_id, cost_price, selling_price, effective_from)
      VALUES (${rows[0].id}, ${cp}, ${sp}, ${today})`;
  }

  const materials = [
    ["Rohu Fish", "Fish", "kg", 5, p(180), 2],
    ["Refined Oil", "Oil & Fat", "litre", 4, p(140), 1],
    ["Maida", "Flour & Grain", "kg", 8, p(45), 2],
    ["Onion", "Vegetable", "kg", 6, p(30), 2],
    ["Packaging Box", "Packaging", "packet", 100, p(2), 30],
  ];
  for (const [name, cat, unit, stock, rate, reorder] of materials) {
    await sql`INSERT INTO raw_materials (name, category, unit, current_stock, last_rate, reorder_level)
      VALUES (${name}, ${cat}, ${unit}, ${stock}, ${rate}, ${reorder})`;
  }

  console.log("Done. Open the app and log in.");
  await sql.end();
}

run().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
