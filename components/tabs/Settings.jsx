"use client";

import { useState } from "react";
import { Save, Download } from "lucide-react";
import { useStore } from "../store";
import { api } from "@/lib/client";
import { MoneyInput } from "../ui";

export default function SettingsTab() {
  const { settings, setSettings, reloadSettings } = useStore();
  const [f, setF] = useState(settings || {});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const row = await api.put("/api/settings", f);
      setSettings(row);
      setMsg("Saved");
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function backup() {
    const [products, rawMaterials, purchases, production, sales, dayCloses, adjustments] =
      await Promise.all([
        api.get("/api/products"),
        api.get("/api/raw-materials"),
        api.get("/api/purchases"),
        api.get("/api/production"),
        api.get("/api/sales"),
        api.get("/api/day-close"),
        api.get("/api/stock-adjustments"),
      ]);
    const data = {
      exportedAt: new Date().toISOString(),
      settings,
      products,
      rawMaterials,
      purchases,
      production,
      sales,
      dayCloses,
      adjustments,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fish-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>

      <div className="card space-y-3">
        <h2 className="font-semibold">Business</h2>
        <div>
          <label className="label">Business name</label>
          <input className="field" value={f.businessName || ""} onChange={(e) => set("businessName", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Currency</label>
            <input className="field" value={f.currency || "₹"} onChange={(e) => set("currency", e.target.value)} />
          </div>
          <div>
            <label className="label">Sales mode</label>
            <select className="field" value={f.salesMode || "quick"} onChange={(e) => set("salesMode", e.target.value)}>
              <option value="quick">Quick (daily totals)</option>
              <option value="bill">Bill (per transaction)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Budget</h2>
        <p className="text-sm text-muted">
          Money set aside for buying raw materials. Purchases are subtracted from
          it on the Dashboard.
        </p>
        <div>
          <label className="label">Allocated budget</label>
          <MoneyInput
            value={f.allocatedBudget ?? 2000000}
            onChange={(v) => set("allocatedBudget", v)}
          />
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Thresholds</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Wastage alert %</label>
            <input className="field" type="number" inputMode="decimal"
              value={f.wastageThresholdPercent ?? 10}
              onChange={(e) => set("wastageThresholdPercent", Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Target margin %</label>
            <input className="field" type="number" inputMode="decimal"
              value={f.targetMarginPercent ?? 40}
              onChange={(e) => set("targetMarginPercent", Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="label">Operating days / month</label>
          <input className="field" type="number" inputMode="numeric"
            value={f.operatingDaysPerMonth ?? 26}
            onChange={(e) => set("operatingDaysPerMonth", Number(e.target.value))} />
        </div>
      </div>

      {msg && <p className="text-sm text-brand">{msg}</p>}
      <button className="btn-primary w-full" onClick={save} disabled={busy}>
        <Save size={18} /> {busy ? "Saving…" : "Save settings"}
      </button>

      <div className="card space-y-3">
        <h2 className="font-semibold">Backup</h2>
        <p className="text-sm text-muted">
          Download a full JSON snapshot of your data. Your data lives online in
          the database, but a backup is handy before big changes.
        </p>
        <button className="btn-ghost w-full" onClick={backup}>
          <Download size={18} /> Download backup (.json)
        </button>
      </div>
    </div>
  );
}
