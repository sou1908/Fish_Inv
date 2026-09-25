# Fish Snacks Studio

Simple daily sales and profit/loss app for a single fish-snacks vendor.
React (Next.js) + Supabase Postgres, deployed on Vercel. Single shared-password gate.

Products need only a name and selling price. In Sales, record each product's
quantity sold and **total daily cost**. Profit/loss = quantity × saved selling
price − total daily cost. Costs can be recorded even with zero items sold.
The Dashboard shows today's totals. Reports has 7/30/90-day presets and custom
dates, weekday revenue averages, product profit, and PDF/CSV downloads.
The Dashboard also shows overall profit/loss across all recorded sales,
separate daily revenue and profit/loss charts for the last 30 days or all time, and each product's share of items sold
across all time.
Settings has one overall budget. The Dashboard shows this budget minus all
recorded product costs (including historical sales costs). It does not reset.
Settings also downloads and restores versioned JSON backups of all application
tables, including the older inventory records. Restore validates the file and
replaces the data in one database transaction; download a current backup first.
The original inventory specification in `fish.md` is historical.

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

3. **Create the tables** (pushes the Drizzle schema to Supabase):

   ```
   npm run db:push
   ```

4. *(optional, on an empty development database)* **Seed demo products:**

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

Dashboard · Sales · Products · Reports · Settings — mobile-first, bottom tab bar.

## Updating an existing database

Before running this version against an existing database, apply
`migrations/001_daily_sales_cost.sql` (or run `npm run db:push`). It only adds
the nullable `sales.total_cost` column and does not delete records.
Existing sales with a null total cost retain their original quantity × cost
snapshot calculation. New entries use the exact total daily cost entered.
Editing a sale retains its original selling price. Archived products remain
in historical totals. The old inventory tables and endpoints are retained
for compatibility but are no longer part of the app navigation.

The simplified profit/loss figures use sales costs only. Old day-close overheads
and purchase records are not included; include all relevant costs in each
product's daily cost going forward.

Run `npm test`, `npm run lint`, and `npm run build` to validate changes.
