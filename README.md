# Fish Snacks Studio

Inventory & profit-tracking admin app for a single fish-snacks vendor.
React (Next.js) + Supabase Postgres, deployed on Vercel. Single shared-password gate.

Built from the spec in [`fish.md`](./fish.md).

## Stack

- **Next.js 16** (App Router) — frontend + API routes in one project
- **Supabase Postgres** + **Drizzle ORM** (`postgres.js` driver)
- **Tailwind v4**, **recharts** (charts), **jspdf** (PDF), **lucide-react** (icons)
- Single password gate via cookie + middleware (no user accounts)

Money is stored as integer **paise**; dates as `YYYY-MM-DD` strings.

## Local setup

1. **Create a Supabase project** at https://supabase.com. During setup, save the
   **database password**. Then go to **Project Settings → Database → Connection
   string → URI** and copy the **Transaction pooler** URI.

2. **Fill in `.env.local`** (copy from `.env.example`):

   ```
   DATABASE_URL="postgresql://postgres.xxxx:YOUR-DB-PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres"
   APP_PASSWORD="pick-a-password"
   AUTH_SECRET="a-long-random-string"
   ```

3. **Create the tables** (pushes the Drizzle schema to Neon):

   ```
   npm run db:push
   ```

4. *(optional)* **Seed demo products & materials:**

   ```
   npm run db:seed
   ```

5. **Run it:**

   ```
   npm run dev
   ```

   Open http://localhost:3000, enter your `APP_PASSWORD`.

## Deploy to Vercel

1. Push this folder to a Git repo and import it into Vercel.
2. In **Project → Settings → Environment Variables**, add `DATABASE_URL`,
   `APP_PASSWORD`, and `AUTH_SECRET` (same values as `.env.local`).
3. Run `npm run db:push` once (locally, with the prod `DATABASE_URL`) so the
   tables exist. The Supabase Transaction pooler URI works on Vercel functions.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:push` | Create/update tables in Supabase from the schema |
| `npm run db:generate` | Generate SQL migration files |
| `npm run db:seed` | Insert demo data |
| `npm run db:studio` | Drizzle Studio (browse the DB) |

## Tabs

Dashboard · Sales · Production · Day Close · Purchases · Raw Stock · Products ·
Reports · Settings — mobile-first, bottom tab bar.
