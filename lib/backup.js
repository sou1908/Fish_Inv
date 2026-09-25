import { getTableColumns } from "drizzle-orm";
import * as schema from "./db/schema.js";

export const BACKUP_FORMAT = "fish-inv-json-backup";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

// Include hidden legacy records as well as the current product/sales workflow.
// The order also permits restoring IDs before the rows that reference them.
export const BACKUP_TABLES = [
  "settings", "rawMaterials", "products", "productPriceHistory", "purchases",
  "productionRuns", "sales", "dayCloses", "stockAdjustments",
];

export function makeBackup(tables, exportedAt = new Date().toISOString()) {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, tables };
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateBackup(input) {
  if (!isPlainObject(input) || input.format !== BACKUP_FORMAT || input.version !== BACKUP_VERSION ||
      !isPlainObject(input.tables) || !Number.isFinite(Date.parse(input.exportedAt))) {
    throw new Error("This is not a supported Fish Inventory JSON backup.");
  }
  if (Object.keys(input.tables).length !== BACKUP_TABLES.length ||
      Object.keys(input.tables).some((name) => !BACKUP_TABLES.includes(name))) {
    throw new Error("Backup is missing a required data section.");
  }

  const restored = {};
  for (const name of BACKUP_TABLES) {
    const rows = input.tables[name];
    if (!Array.isArray(rows)) throw new Error(`Invalid ${name} section in backup.`);
    const columns = getTableColumns(schema[name]);
    const keys = Object.keys(columns);
    const seenIds = new Set();
    restored[name] = rows.map((row, index) => {
      if (!isPlainObject(row) || Object.keys(row).length !== keys.length ||
          Object.keys(row).some((key) => !keys.includes(key))) {
        throw new Error(`Invalid ${name} row ${index + 1} in backup.`);
      }
      const clean = {};
      for (const key of keys) {
        const value = row[key];
        const column = columns[key];
        if (value === null) {
          if (column.notNull) throw new Error(`Missing ${name}.${key} in backup.`);
          clean[key] = null;
        } else if (column.dataType === "number" &&
          (typeof value !== "number" || !Number.isFinite(value) ||
            (column.columnType !== "PgReal" && !Number.isInteger(value)))) {
          throw new Error(`Invalid ${name}.${key} in backup.`);
        } else if (column.dataType === "boolean" && typeof value !== "boolean") {
          throw new Error(`Invalid ${name}.${key} in backup.`);
        } else if (column.dataType === "string" && typeof value !== "string") {
          throw new Error(`Invalid ${name}.${key} in backup.`);
        } else if (column.dataType === "json" && typeof value !== "object") {
          throw new Error(`Invalid ${name}.${key} in backup.`);
        } else if (column.dataType === "date" &&
          (typeof value !== "string" || !Number.isFinite(Date.parse(value)))) {
          throw new Error(`Invalid ${name}.${key} in backup.`);
        }
        clean[key] = column.dataType === "date" && value !== null ? new Date(value) : value;
      }
      if ("id" in row) {
        if (!Number.isInteger(row.id) || row.id < 1 || seenIds.has(row.id)) throw new Error(`Invalid or repeated ${name} ID.`);
        seenIds.add(row.id);
      }
      return clean;
    });
  }
  if (restored.settings.length !== 1 || restored.settings[0].id !== 1) {
    throw new Error("Backup must contain exactly one settings record.");
  }
  return restored;
}
