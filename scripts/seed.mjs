import { config } from "dotenv";
import postgres from "postgres";
config({ path: ".env.local" });
const sql = postgres(process.env.DATABASE_URL, { prepare: false, ssl: "require" });
try {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO settings (id, business_name) VALUES (1, 'My Fish Snacks') ON CONFLICT (id) DO NOTHING`;
    for (const [name, price] of [["Fish Momo", 1500], ["Fish Cutlet", 2000], ["Fish Roll", 2500], ["Fish Pakora", 1000]]) {
      await tx`INSERT INTO products (name, selling_price) VALUES (${name}, ${price})`;
    }
  });
  console.log("Demo products added. Enter daily costs and quantities in Sales.");
} finally {
  await sql.end();
}
