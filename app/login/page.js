"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fish, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setError("That password didn't match. Try again.");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 text-white"
      style={{ background: "linear-gradient(150deg, var(--ink) 0%, var(--ink-2) 60%, #0a2320 100%)" }}
    >
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--brand)" }}
      />
      <form onSubmit={submit} className="relative w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="h-16 w-16 rounded-2xl bg-brand text-ink flex items-center justify-center shadow-lg">
            <Fish size={30} />
          </div>
          <div className="text-center">
            <div className="eyebrow text-brand">Fish Snacks Studio</div>
            <h1 className="font-display text-2xl font-bold mt-1">Open the ledger</h1>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-white/50 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                className="w-full rounded-xl bg-white/10 border border-white/15 pl-10 pr-3 py-3 text-base text-white placeholder-white/30 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 transition"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="btn-primary w-full" disabled={busy || !password}>
            {busy ? "Checking…" : "Unlock"}
          </button>
        </div>
        <p className="text-center text-xs text-white/40 mt-5">One shared password for the stall.</p>
      </form>
    </div>
  );
}
