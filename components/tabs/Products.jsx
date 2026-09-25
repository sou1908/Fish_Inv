"use client";
import { useState } from "react";
import { Plus, Package, Pencil } from "lucide-react";
import { useStore } from "../store";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/money";
import { validAmount } from "@/lib/profit";
import { MoneyInput, Modal, EmptyState } from "../ui";

export default function Products() {
  const { products, reloadProducts, currency } = useStore();
  const [editing, setEditing] = useState(null);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Products</h1>
        <button className="btn-primary" onClick={() => setEditing({})}><Plus size={18} /> Add product</button>
      </div>
      <p className="text-sm text-muted">Add a name and selling price. Enter daily costs in Sales.</p>
      {products.length === 0 && <EmptyState icon={Package} title="No products yet" hint="Add your first product to get started." />}
      {products.map((p) => (
        <div key={p.id} className="card flex items-center justify-between gap-3">
          <div><div className="font-semibold">{p.name}{!p.isActive && <span className="text-muted text-xs ml-2">Archived</span>}</div>
            <p className="text-sm text-muted">{formatMoney(p.sellingPrice, currency)} each</p></div>
          <button className="btn-ghost" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}><Pencil size={16} /> Edit</button>
        </div>
      ))}
      {editing && <ProductForm initial={editing} onClose={() => setEditing(null)} onSaved={async () => { await reloadProducts(); setEditing(null); }} />}
    </div>
  );
}

function ProductForm({ initial, onClose, onSaved }) {
  const [name, setName] = useState(initial.name || "");
  const [sellingPrice, setSellingPrice] = useState(initial.sellingPrice ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    if (!name.trim() || !validAmount(sellingPrice)) return setError("Enter a name and a valid non-negative price.");
    setBusy(true); setError("");
    try {
      const payload = { name: name.trim(), sellingPrice };
      if (initial.id) await api.put(`/api/products/${initial.id}`, payload);
      else await api.post("/api/products", payload);
      await onSaved();
    } catch (e) { setError(e.message); setBusy(false); }
  }
  async function toggleArchive() {
    setBusy(true); setError("");
    try {
      await api.put(`/api/products/${initial.id}`, { isActive: !initial.isActive });
      await onSaved();
    } catch (e) { setError(e.message); setBusy(false); }
  }
  return (
    <Modal open onClose={() => !busy && onClose()} title={initial.id ? "Edit product" : "Add product"}>
      <form onSubmit={save} className="space-y-4">
        <label className="block"><span className="label">Product name</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label className="block"><span className="label">Selling price per item</span><MoneyInput value={sellingPrice} onChange={setSellingPrice} /></label>
        {initial.id && <p className="text-xs text-muted">Price changes apply to new sales. Previously saved sales keep their original price.</p>}
        {error && <p role="alert" className="text-danger text-sm">{error}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" disabled={busy} onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" disabled={busy}>{busy ? "Saving…" : "Save product"}</button>
        </div>
        {initial.id && <button type="button" className="btn-ghost text-sm w-full" disabled={busy} onClick={toggleArchive}>{initial.isActive ? "Archive product (keep past sales)" : "Restore product"}</button>}
      </form>
    </Modal>
  );
}
