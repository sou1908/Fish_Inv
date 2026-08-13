import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy singleton so importing this module never connects at build time.
let _db = null;

function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Supabase requires SSL. prepare:false keeps us compatible with the
  // Supabase transaction pooler (Supavisor), which doesn't do prepared statements.
  const client = postgres(url, { prepare: false, ssl: "require" });
  _db = drizzle(client, { schema });
  return _db;
}

// Proxy that forwards every access to the real drizzle instance on first use.
export const db = new Proxy(
  {},
  {
    get(_t, prop) {
      const real = getDb();
      const val = real[prop];
      return typeof val === "function" ? val.bind(real) : val;
    },
  }
);

export { schema };
