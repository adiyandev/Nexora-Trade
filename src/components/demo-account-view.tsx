"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Position = {
  assetId: string;
  symbol: string;
  name: string;
  quantity: number;
  averageEntryPrice: number;
  currentPrice: number | null;
  marketValue: number | null;
  costBasis: number;
  unrealizedPnl: number | null;
  quoteTime: number | null;
  quoteAgeSeconds: number | null;
  quoteUnavailable: boolean;
};
type RecentOrder = {
  id: string;
  symbol: string;
  side: string;
  orderType: string;
  status: string;
  quantity: number;
  createdAt: string;
  fillPrice: number | null;
};
type AccountResponse = {
  account: {
    id: string;
    name: string;
    initialBalance: number;
    cash: number;
    marketValue: number | null;
    equity: number | null;
    realizedPnl: number;
    unrealizedPnl: number | null;
    quoteCoverage: "complete" | "partial";
    createdAt: string;
  };
  positions: Position[];
  equityHistory: Array<{ timestamp: string; equity: number; cash: number; marketValue: number }>;
  recentOrders: RecentOrder[];
};
type Props = { mode: "overview" | "portfolio" };

const money = (value: number | null, digits = 2) => value === null
  ? "—"
  : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const number = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 8 });
const pnlClass = (value: number | null) => value === null ? "muted" : value >= 0 ? "positive" : "negative";

export function DemoAccountView({ mode }: Props) {
  const [data, setData] = useState<AccountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/demo/account", { cache: "no-store" });
      const payload = await response.json() as AccountResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Demo account could not be loaded.");
      setData(payload);
      setError("");
    } catch (cause) {
      setData(null);
      setError(cause instanceof Error ? cause.message : "Demo account could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return <section className="account-loading" aria-live="polite">
      <div className="skeleton-line wide" /><div className="skeleton-stats"><span /><span /><span /><span /></div>
      <p>Loading your recorded demo account…</p>
    </section>;
  }

  if (error || !data) {
    const needsSignIn = error.toLowerCase().includes("sign in");
    return <section className="account-empty">
      <span className="trade-eyebrow">DEMO ACCOUNT</span>
      <h2>{needsSignIn ? "Sign in to open your demo account" : "Account data unavailable"}</h2>
      <p>{needsSignIn ? "Your virtual balance and trade history are private to your account. Sign in or create an account to begin." : error || "The account could not be loaded."}</p>
      {needsSignIn ? <div className="trade-auth-links"><Link href="/auth/sign-in" className="btn">Sign in</Link><Link href="/auth/sign-up" className="btn btn-secondary">Create account</Link></div> : <button className="btn btn-secondary" onClick={() => void load()}>Retry</button>}
    </section>;
  }

  const { account, positions, equityHistory, recentOrders } = data;
  const showHistory = equityHistory.length >= 2;

  return <div className={mode === "overview" ? "demo-account-view overview-account-view" : "demo-account-view portfolio-account-view"}>
    <div className="account-mode-row"><span className="trade-eyebrow">MAIN DEMO ACCOUNT</span><span className="account-mode">VIRTUAL FUNDS</span></div>
    <div className="account-metrics">
      <div className="account-metric primary-metric"><span>Portfolio equity</span><strong>{money(account.equity)}</strong><small>{account.equity === null ? "Some position quotes unavailable" : "Cash + current position value"}</small></div>
      <div className="account-metric"><span>Available cash</span><strong>{money(account.cash)}</strong><small>Virtual funds</small></div>
      <div className="account-metric"><span>Unrealized P&amp;L</span><strong className={pnlClass(account.unrealizedPnl)}>{money(account.unrealizedPnl)}</strong><small>Open positions only</small></div>
      <div className="account-metric"><span>Realized P&amp;L</span><strong className={pnlClass(account.realizedPnl)}>{money(account.realizedPnl)}</strong><small>Recorded sell fills</small></div>
    </div>

    {mode === "portfolio" && <section className="account-panel">
      <div className="account-panel-head"><div><h2>Equity history</h2><p>Recorded snapshots of your actual demo account.</p></div><span className="history-count">{equityHistory.length} snapshots</span></div>
      {showHistory ? <div className="equity-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={equityHistory} margin={{ top: 12, right: 16, bottom: 0, left: 4 }}>
            <defs><linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} /><stop offset="100%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="#242b30" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="timestamp" tickFormatter={value => new Date(value).toLocaleDateString([], { month: "short", day: "numeric" })} tick={{ fill: "#8b949e", fontSize: 10 }} axisLine={{ stroke: "#242b30" }} tickLine={false} minTickGap={35} />
            <YAxis tickFormatter={value => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)} tick={{ fill: "#8b949e", fontSize: 10 }} axisLine={false} tickLine={false} width={48} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "#13171b", border: "1px solid #30383e", borderRadius: 7, color: "#f3f5f6", fontSize: 11 }} labelFormatter={value => new Date(String(value)).toLocaleString()} formatter={value => [money(Number(value)), "Equity"]} />
            <Area type="monotone" dataKey="equity" stroke="#22c55e" strokeWidth={1.7} fill="url(#equityFill)" dot={false} activeDot={{ r: 3, fill: "#22c55e", stroke: "#0e1114", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div> : <div className="history-empty"><span className="history-empty-mark">↗</span><b>Not enough recorded history yet</b><p>Real equity snapshots are recorded when your account is viewed, at most once every 15 minutes. The chart will appear after another snapshot is recorded. No performance line is fabricated.</p><button className="btn btn-secondary" onClick={() => void load()}>Refresh account snapshot</button></div>}
    </section>}

    <section className="account-panel">
      <div className="account-panel-head"><div><h2>Open positions</h2><p>Marked using the latest available provider quote.</p></div>{mode === "overview" && <Link href="/portfolio" className="text-link">View portfolio →</Link>}</div>
      {positions.length === 0 ? <div className="account-inline-empty"><b>No open positions</b><span>Submit a demo buy order to start building a portfolio.</span><Link href="/trade" className="text-link">Open trade ticket →</Link></div> : <div className="table-wrap">
        <table className="account-table"><thead><tr><th>Instrument</th><th>Quantity</th><th>Avg. entry</th><th>Last quote</th><th>Market value</th><th>Unrealized P&amp;L</th></tr></thead><tbody>
          {positions.slice(0, mode === "overview" ? 5 : undefined).map(position => <tr key={position.assetId}>
            <td><div className="table-symbol"><b>{position.symbol}</b><small>{position.name}</small></div></td>
            <td>{number(position.quantity)}</td><td>{money(position.averageEntryPrice)}</td><td>{money(position.currentPrice)}</td><td>{money(position.marketValue)}</td><td className={pnlClass(position.unrealizedPnl)}>{money(position.unrealizedPnl)}</td>
          </tr>)}
        </tbody></table>
      </div>}
      {account.quoteCoverage === "partial" && <p className="quote-warning">One or more market quotes could not be retrieved. Portfolio equity is withheld until all open positions can be valued.</p>}
    </section>

    {mode === "overview" && <section className="account-panel">
      <div className="account-panel-head"><div><h2>Recent orders</h2><p>Actual orders recorded in your demo account.</p></div><Link href="/orders" className="text-link">All orders →</Link></div>
      {recentOrders.length === 0 ? <div className="account-inline-empty"><b>No recorded orders yet</b><span>Your order history will appear here after your first simulated fill.</span></div> : <div className="table-wrap"><table className="account-table"><thead><tr><th>Instrument</th><th>Side</th><th>Type</th><th>Quantity</th><th>Fill price</th><th>Status</th><th>Time</th></tr></thead><tbody>
        {recentOrders.slice(0, 5).map(order => <tr key={order.id}><td><b>{order.symbol}</b></td><td className={order.side === "buy" ? "positive" : "negative"}>{order.side.toUpperCase()}</td><td>{order.orderType}</td><td>{number(order.quantity)}</td><td>{money(order.fillPrice)}</td><td><span className="order-status">{order.status}</span></td><td>{new Date(order.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td></tr>)}
      </tbody></table></div>}
    </section>}
  </div>;
}
