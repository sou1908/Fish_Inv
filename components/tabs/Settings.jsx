"use client";
import { useState } from "react";
import { Download, Upload } from "lucide-react";
import { useStore } from "../store";
import { api } from "@/lib/client";
import { MoneyInput } from "../ui";
import { validAmount } from "@/lib/profit";

const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
const BACKUP_SECTIONS = ["settings", "products", "sales", "rawMaterials", "productPriceHistory",
  "purchases", "productionRuns", "dayCloses", "stockAdjustments"];

export default function Settings() {
  const { settings, setSettings, currency } = useStore();
  const [name, setName] = useState(settings?.businessName || "");
  const [budget, setBudget] = useState(settings?.allocatedBudget ?? 0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  async function save(e) {
    e.preventDefault();
    if (!name.trim() || !validAmount(budget)) return setMessage("Enter a name and a valid non-negative budget.");
    setBusy(true); setMessage("");
    try {
      setSettings(await api.put("/api/settings", { businessName: name.trim(), allocatedBudget: budget }));
      setMessage("Settings saved.");
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }

  async function download() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/backup", { cache: "no-store" });
      if (!response.ok) throw new Error((await response.json()).error || "Backup download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fish-inv-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Backup downloaded. Keep the JSON file somewhere safe.");
    } catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }

  async function chooseFile(selected) {
    setFile(null); setPreview(null); setMessage("");
    if (!selected) return;
    if (selected.size > MAX_BACKUP_BYTES) return setMessage("Backup exceeds 50 MB.");
    try {
      const data = JSON.parse(await selected.text());
      if (data.format !== "fish-inv-json-backup" || data.version !== 1 ||
          !data.tables || BACKUP_SECTIONS.some((key) => !Array.isArray(data.tables[key]))) {
        throw new Error("This is not a supported Fish Inventory backup.");
      }
      setFile(selected);
      setPreview({
        date: data.exportedAt && !Number.isNaN(Date.parse(data.exportedAt)) ? new Date(data.exportedAt).toLocaleString() : "Unknown",
        products: data.tables.products.length, sales: data.tables.sales.length,
      });
    } catch (e) { setMessage(e instanceof SyntaxError ? "Choose a valid JSON file." : e.message); }
  }

  async function restore() {
    if (!file || !preview) return;
    if (!confirm(`Restore ${file.name}? This replaces all current app data with ${preview.products} products and ${preview.sales} sales from the backup. Download a current backup first if you need it.`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/backup", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: await file.text(),
      });
      if (!response.ok) throw new Error((await response.json()).error || "Restore failed");
      window.location.reload();
    } catch (e) { setMessage(e.message); setBusy(false); }
  }

  return <div className="max-w-xl space-y-5">
    <form onSubmit={save} className="card space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>
      <label className="block"><span className="label">Business name</span><input className="field" required value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="block"><span className="label">Overall budget ({currency})</span><MoneyInput value={budget} onChange={setBudget} /></label>
      <p className="text-xs text-muted">The Dashboard subtracts every recorded product cost from this one budget. It does not reset monthly.</p>
      <button className="btn-primary" disabled={busy || !name.trim()}>{busy ? "Working…" : "Save settings"}</button>
    </form>
    <section className="card space-y-4">
      <div><h2 className="text-lg font-bold">JSON backup</h2><p className="text-sm text-muted mt-1">Download all app data before an update. Restore a saved file if you need to recover it.</p></div>
      <button type="button" className="btn-ghost" disabled={busy} onClick={download}><Download size={18} /> Download backup</button>
      <div className="border-t border-border pt-4 space-y-3">
        <label className="block"><span className="label">Upload backup (.json)</span><input className="field" type="file" accept=".json,application/json" disabled={busy} onChange={(e) => chooseFile(e.target.files?.[0])} /></label>
        {preview && <p className="text-sm">Backup from {preview.date}: {preview.products} products, {preview.sales} sales.</p>}
        <p className="text-xs text-muted">Restoring replaces all current app data, including settings, products, sales, and older inventory records. Download a current backup first.</p>
        <button type="button" className="btn-primary" disabled={busy || !preview} onClick={restore}><Upload size={18} /> Restore backup</button>
      </div>
    </section>
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}
