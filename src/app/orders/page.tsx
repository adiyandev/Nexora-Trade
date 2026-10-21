"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";

type Order = {
  id: string;
  symbol: string;
  name: string;
  side: string;
  type: string;
  status: string;
  quantity: number;
  submittedAt: string;
  fillPrice: number | null;
  filledAt: string | null;
};
const money = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(value);

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/demo/orders", { cache: "no-store" });
      const payload = await response.json() as { orders?: Order[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Order history is unavailable.");
      setOrders(payload.orders ?? []);
      setError("");
    } catch (cause) {
      setOrders([]);
      setError(cause instanceof Error ? cause.message : "Order history is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => filter === "all" ? orders : orders.filter(order => order.status.toLowerCase() === filter), [filter, orders]);
  const needsSignIn = error.toLowerCase().includes("sign in");

  return <AppShell>
    <PageHeading title="Orders" subtitle="Review submitted market orders and recorded simulated fills. Filled market orders cannot be canceled." />
    <section className="account-panel order-history-panel">
      <div className="account-panel-head">
        <div><h2>Order history</h2><p>Up to 100 most recent recorded orders.</p></div>
        <div className="order-filters" role="group" aria-label="Filter orders">
          {[["all","All"],["filled","Filled"],["canceled","Canceled"],["rejected","Rejected"]].map(([value,label]) => <button key={value} className={filter === value ? "filter-chip active" : "filter-chip"} onClick={() => setFilter(value)} aria-pressed={filter === value}>{label}</button>)}
        </div>
      </div>
      {loading ? <div className="history-empty">Loading recorded orders…</div>
        : error ? <div className="account-empty"><h2>{needsSignIn ? "Sign in to view orders" : "Order history unavailable"}</h2><p>{error}</p>{needsSignIn ? <div className="trade-auth-links"><Link href="/auth/sign-in" className="btn">Sign in</Link><Link href="/auth/sign-up" className="btn btn-secondary">Create account</Link></div> : <button className="btn btn-secondary" onClick={() => void load()}>Retry</button>}</div>
        : filtered.length === 0 ? <div className="history-empty"><span className="history-empty-mark">↗</span><b>{orders.length === 0 ? "No orders recorded yet" : "No orders match this filter"}</b><p>{orders.length === 0 ? "Your demo market orders and fills will appear here after you place your first simulated trade." : "Choose another status filter to view your orders."}</p>{orders.length === 0 && <Link href="/trade" className="btn">Open trade ticket</Link>}</div>
        : <div className="table-wrap"><table className="account-table"><thead><tr><th>Instrument</th><th>Side</th><th>Type</th><th>Quantity</th><th>Fill price</th><th>Status</th><th>Submitted</th><th>Order ID</th></tr></thead><tbody>
          {filtered.map(order => <tr key={order.id}><td><div className="table-symbol"><b>{order.symbol}</b><small>{order.name}</small></div></td><td className={order.side === "buy" ? "positive" : "negative"}>{order.side.toUpperCase()}</td><td>{order.type}</td><td>{order.quantity.toLocaleString("en-US", { maximumFractionDigits: 12 })}</td><td>{money(order.fillPrice)}</td><td><span className="order-status">{order.status}</span></td><td>{new Date(order.submittedAt).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td><td><code>{order.id.slice(0, 8)}</code></td></tr>)}
        </tbody></table></div>}
    </section>
  </AppShell>;
}
