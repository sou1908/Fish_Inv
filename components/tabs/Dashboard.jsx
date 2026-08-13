"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Receipt, ChefHat, ClipboardCheck, ShoppingCart,
  TrendingUp, TrendingDown, AlertTriangle, Wallet,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from "recharts";
import { useStore } from "../store";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/money";
import { today, addDays, prettyDate } from "@/lib/date";
import { Spinner, EmptyState } from "../ui";

export default function Dashboard({ goTo }) {
  const { rawMaterials, currency, productById, settings } = useStore();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [closes, setCloses] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const from = addDays(today(), -29);
  const to = today();

  useEffect(() => {
    (async () => {
      const [s, c, as, p] = await Promise.all([
        api.get(`/api/sales?from=${from}&to=${to}`),
        api.get(`/api/day-close?from=${from}&to=${to}`),
        api.get(`/api/sales`),
        api.get(`/api/purchases`),
      ]);
      setSales(s);
      setCloses(c);
      setAllSales(as);
      setPurchases(p);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // budget & all-time sales
  const allocated = settings?.allocatedBudget ?? 2000000;
  const spent = purchases.reduce((s, p) => s + (p.total || 0), 0);
  const remaining = allocated - spent;
  const spentPct = allocated > 0 ? Math.min(100, (spent / allocated) * 100) : 0;
  const overBudget = remaining < 0;
  const totalSales = allSales.reduce((s, x) => s + x.quantity * x.unitPrice, 0);

  const todaySales = sales.filter((s) => s.date === to);
  const revenue = todaySales.reduce((s, x) => s + x.quantity * x.unitPrice, 0);
  const cogs = todaySales.reduce((s, x) => s + x.quantity * x.costPriceSnapshot, 0);
  const gross = revenue - cogs;
  const todayClose = closes.find((c) => c.date === to);
  const overheads = (todayClose?.overheads || []).reduce((s, o) => s + (o.amount || 0), 0);
  const net = gross - overheads;
  const marginPct = revenue > 0 ? (gross / revenue) * 100 : 0;

  // 30-day sparkline
  const spark = useMemo(() => {
    const byDay = {};
    sales.forEach((s) => {
      byDay[s.date] = (byDay[s.date] || 0) + s.quantity * s.unitPrice;
    });
    const out = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(to, -i);
      out.push({ date: d.slice(5), value: (byDay[d] || 0) / 100 });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales]);

  // product ranking by total profit (30d)
  const ranking = useMemo(() => {
    const by = {};
    sales.forEach((s) => {
      by[s.productId] = (by[s.productId] || 0) + s.quantity * (s.unitPrice - s.costPriceSnapshot);
    });
    return Object.entries(by)
      .map(([pid, profit]) => ({ pid: Number(pid), profit }))
      .sort((a, b) => b.profit - a.profit);
  }, [sales]);
  const top3 = ranking.slice(0, 3);
  const bottom3 = ranking.slice(-3).reverse();

  const lowStock = rawMaterials.filter((r) => r.reorderLevel > 0 && r.currentStock <= r.reorderLevel);

  if (loading) return <Spinner />;

  const hasSales = revenue > 0 || todaySales.length > 0;
  const verdict = !hasSales
    ? "No sales recorded yet"
    : net > 0
    ? "You're up today"
    : net < 0
    ? "You're down today"
    : "Breaking even today";

  return (
    <div className="space-y-6">
      {/* ---- verdict hero (the ledger panel) ---- */}
      <section
        className="relative overflow-hidden rounded-3xl text-white p-6 md:p-8"
        style={{ background: "linear-gradient(140deg, var(--ink) 0%, var(--ink-2) 100%)" }}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-20 blur-2xl"
          style={{ background: "var(--brand)" }}
        />
        <div className="relative">
          <div className="eyebrow text-brand">
            {prettyDate(to)} · Today&apos;s ledger
          </div>
          <div className="mt-3 font-display text-xl md:text-2xl text-white/90">{verdict}</div>
          <div
            className="num text-5xl md:text-6xl font-extrabold mt-1"
            style={{ color: !hasSales ? "rgba(255,255,255,0.85)" : net >= 0 ? "var(--leaf)" : "var(--coral)" }}
          >
            {hasSales && net < 0 ? "−" : hasSales && net > 0 ? "+" : ""}
            {formatMoney(Math.abs(net), currency)}
          </div>

          {/* stat strip */}
          <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 md:divide-x md:divide-white/10">
            <HeroStat label="Revenue" value={formatMoney(revenue, currency)} />
            <HeroStat label="Gross profit" value={formatMoney(gross, currency)} className="md:pl-6" />
            <HeroStat label="Overheads" value={formatMoney(overheads, currency)} className="md:pl-6" />
            <HeroStat label="Margin" value={`${marginPct.toFixed(1)}%`} className="md:pl-6" />
          </div>
        </div>
      </section>

      {/* budget & sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="eyebrow flex items-center gap-1.5">
              <Wallet size={14} /> Budget
            </span>
            <button
              onClick={() => goTo("settings")}
              className="text-xs font-medium text-muted hover:text-brand-strong"
            >
              Edit
            </button>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-xs text-muted">Remaining</div>
              <div className={`num text-3xl font-bold ${overBudget ? "text-danger" : "text-ok"}`}>
                {formatMoney(remaining, currency)}
              </div>
            </div>
            <div className="text-sm text-muted num">of {formatMoney(allocated, currency)}</div>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-black/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${spentPct}%`, background: overBudget ? "var(--coral)" : "var(--brand)" }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span className="num">Spent {formatMoney(spent, currency)}</span>
            <span>{overBudget ? "Over budget" : `${spentPct.toFixed(0)}% used`}</span>
          </div>
        </div>

        <div className="card flex flex-col">
          <span className="eyebrow flex items-center gap-1.5">
            <Receipt size={14} /> Total sales
          </span>
          <div className="num text-3xl font-bold text-ok mt-3">
            {formatMoney(totalSales, currency)}
          </div>
          <div className="text-xs text-muted mt-1">
            {allSales.length} sale{allSales.length === 1 ? "" : "s"} recorded
          </div>
        </div>
      </div>

      {/* sparkline */}
      <div className="card">
        <div className="eyebrow mb-3">Revenue · last 30 days</div>
        <div className="h-40 md:h-52">
          {spark.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E8A33D" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#E8A33D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <Tooltip
                  formatter={(v) => [`${currency}${Number(v).toFixed(0)}`, "Revenue"]}
                  labelFormatter={(l) => l}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}
                />
                <Area type="monotone" dataKey="value" stroke="#CF861C" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted">
              No sales yet — record a sale to see the trend.
            </div>
          )}
        </div>
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-4 gap-3">
        <QuickAction icon={Receipt} label="Sale" onClick={() => goTo("sales")} />
        <QuickAction icon={ChefHat} label="Make" onClick={() => goTo("production")} />
        <QuickAction icon={ShoppingCart} label="Buy" onClick={() => goTo("purchases")} />
        <QuickAction icon={ClipboardCheck} label="Close" onClick={() => goTo("dayclose")} />
      </div>

      {/* alerts */}
      {lowStock.length > 0 && (
        <div className="card border-amber-300 bg-amber-50/50">
          <div className="flex items-center gap-2 text-warn font-medium text-sm">
            <AlertTriangle size={16} /> Low stock
          </div>
          <div className="text-sm text-muted mt-1">{lowStock.map((r) => r.name).join(", ")}</div>
        </div>
      )}

      {/* rankings */}
      {ranking.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No sales in the last 30 days" hint="Record a sale to see rankings." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RankList title="Top earners (30d)" icon={TrendingUp} items={top3} productById={productById} currency={currency} good />
          {ranking.length > 3 && (
            <RankList title="Lowest earners (30d)" icon={TrendingDown} items={bottom3} productById={productById} currency={currency} />
          )}
        </div>
      )}
    </div>
  );
}

function HeroStat({ label, value, className = "" }) {
  return (
    <div className={className}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="num text-lg md:text-xl font-bold text-white mt-1">{value}</div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card card-hover flex flex-col items-center gap-2 py-4 hover:border-brand/50 active:scale-95"
    >
      <span className="h-11 w-11 rounded-full bg-brand/12 text-brand-strong flex items-center justify-center">
        <Icon size={21} />
      </span>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

function RankList({ title, icon: Icon, items, productById, currency, good }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-semibold text-muted mb-2">
        <Icon size={16} /> {title}
      </div>
      <div className="card p-0 divide-y divide-border">
        {items.map((x) => (
          <div key={x.pid} className="flex items-center justify-between p-3">
            <span className="font-medium">{productById(x.pid)?.name || "—"}</span>
            <span className={`num font-bold ${good ? "text-ok" : x.profit < 0 ? "text-danger" : ""}`}>
              {formatMoney(x.profit, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
