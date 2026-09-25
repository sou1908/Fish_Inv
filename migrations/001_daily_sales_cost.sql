-- Additive migration: existing records keep their snapshotted per-unit cost.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_cost integer;
