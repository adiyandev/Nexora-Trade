"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";

const INSTRUMENTS = [
  { symbol: "AAPL", name: "Apple Inc." }, { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "NVDA", name: "NVIDIA Corporation" }, { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "AMZN", name: "Amazon.com, Inc." }, { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "META", name: "Meta Platforms, Inc." }, { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF" }, { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "BTC-USD", name: "Bitcoin / USD" }, { symbol: "ETH-USD", name: "Ethereum / USD" },
];
type Item = {
  id: string;
  symbol: string;
  name: string;
  createdAt: string;
  quote: { price: number; previousClose: number | null; change: number | null; changePercent: number | null; currency: string; exchange: string; quoteTime: number } | null;
  quoteError: string | null;
};
const money = (value: number | null | undefined, currency = "USD") => value == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: value < 1 ? 6 : 2 }).format(value);

export default function WatchlistPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [symbol, setSymbol] = useState("AAPL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/demo/watchlist", { cache: "no-store" });
      const payload = await response.json() as { items?: Item[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Watchlist is unavailable.");
      setItems(payload.items ?? []);
      setError("");
    } catch (cause) {
      setItems([]);
      setError(cause instanceof Error ? cause.message : "Watchlist is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function addItem() {
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/demo/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not add symbol.");
      setNotice(`${symbol} added to your watchlist.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add symbol.");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(item: Item) {
    setError(""); setNotice("");
    try {
      const response = await fetch(`/api/demo/watchlist?symbol=${encodeURIComponent(item.symbol)}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not remove symbol.");
      setItems(current => current.filter(existing => existing.symbol !== item.symbol));
      setNotice(`${item.symbol} removed from your watchlist.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove symbol.");
    }
  }

  const needsSignIn = error.toLowerCase().includes("sign in");
  const available = INSTRUMENTS.filter(instrument => !items.some(item => item.symbol === instrument.symbol));

  return <AppShell>
    <PageHeading title="Watchlist" subtitle="Track provider-sourced quotes for your saved instruments. Your watchlist is private to your account." />
    <section className="account-panel watchlist-page-panel">
      <div className="watchlist-add-row">
        <div className="field"><label htmlFor="watchlist-symbol">Add instrument</label><select id="watchlist-symbol" value={symbol} onChange={event => setSymbol(event.target.value)}>{INSTRUMENTS.map(instrument => <option key={instrument.symbol} value={instrument.symbol}>{instrument.symbol} — {instrument.name}</option>)}</select></div>
        <button className="btn" onClick={() => void addItem()} disabled={saving || loading || available.length === 0 || items.some(item => item.symbol === symbol)}>{saving ? "Saving…" : items.some(item => item.symbol === symbol) ? "Already saved" : "Add to watchlist"}</button>
      </div>
      {notice && <p className="watchlist-notice" role="status">{notice}</p>}
      {error && <div className="trade-alert error" role="alert">{error}{needsSignIn && <div className="trade-auth-links"><Link href="/auth/sign-in">Sign in</Link><Link href="/auth/sign-up">Create account</Link></div>}</div>}
      {loading ? <div className="history-empty">Loading saved instruments…</div>
        : error && items.length === 0 ? <div className="history-empty"><b>Watchlist unavailable</b><p>{error}</p><button className="btn btn-secondary" onClick={() => void load()}>Retry</button></div>
        : items.length === 0 ? <div className="history-empty"><span className="history-empty-mark">☆</span><b>Your watchlist is empty</b><p>Add a supported symbol to keep its latest available provider quote close at hand.</p><Link href="/markets" className="btn btn-secondary">Explore markets</Link></div>
        : <div className="table-wrap"><table className="account-table"><thead><tr><th>Instrument</th><th>Last quote</th><th>Daily change</th><th>Exchange</th><th>Quote timestamp</th><th></th></tr></thead><tbody>
          {items.map(item => <tr key={item.id}><td><div className="table-symbol"><b>{item.symbol}</b><small>{item.name}</small></div></td><td>{money(item.quote?.price, item.quote?.currency)}</td><td className={item.quote?.changePercent == null ? "muted" : item.quote.changePercent >= 0 ? "positive" : "negative"}>{item.quote?.changePercent == null ? "—" : `${item.quote.changePercent >= 0 ? "+" : ""}${item.quote.changePercent.toFixed(2)}%`}</td><td>{item.quote?.exchange ?? "Unavailable"}</td><td>{item.quote?.quoteTime ? new Date(item.quote.quoteTime * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Unavailable"}</td><td className="watchlist-row-actions"><Link href={`/markets?symbol=${encodeURIComponent(item.symbol)}`} className="text-link">Chart →</Link><button className="text-button danger-text" onClick={() => void removeItem(item)} aria-label={`Remove ${item.symbol} from watchlist`}>Remove</button></td></tr>)}
        </tbody></table></div>}
      <p className="quote-warning">Quotes may be delayed or unavailable. The watchlist never substitutes sample prices for missing provider data.</p>
    </section>
  </AppShell>;
}
