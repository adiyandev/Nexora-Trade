"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DEMO_INSTRUMENTS } from "@/lib/demo-instruments";

const SYMBOLS = DEMO_INSTRUMENTS.map(({ symbol, name, sector, description }) => ({ symbol, name, sector, description }));
type Quote = {
  symbol: string;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  exchange: string;
  marketState: string;
  quoteTime: number;
  fetchedAt: string;
  provider: string;
};
type QuoteItem = { symbol: string; quote: Quote | null; error: string | null };

const money = (value: number | null, currency = "USD") => value === null ? "—" : new Intl.NumberFormat("en-US", {
  style: "currency", currency, minimumFractionDigits: value < 1 ? 4 : 2, maximumFractionDigits: value < 1 ? 6 : 2,
}).format(value);

export function MarketQuotesPanel() {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/market/quotes", { cache: "no-store" });
      const payload = await response.json() as { quotes?: QuoteItem[]; error?: string };
      if (!response.ok && !payload.quotes) throw new Error(payload.error || "Market quotes are unavailable.");
      setItems(payload.quotes ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Market quotes are unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const visibleItems = items.filter(item => {
    if (filter === "gainers") return item.quote?.changePercent !== null && item.quote?.changePercent !== undefined && item.quote.changePercent > 0;
    if (filter === "losers") return item.quote?.changePercent !== null && item.quote?.changePercent !== undefined && item.quote.changePercent < 0;
    return true;
  });
  const successfulCount = items.filter(item => item.quote !== null).length;

  return <section className="account-panel market-quotes-panel">
    <div className="account-panel-head">
      <div><h2>Market watch</h2><p>Simulated prices · fictional demo instruments</p></div>
      <div className="market-quotes-actions">
        <span className="history-count">{successfulCount}/{items.length || SYMBOLS.length} quotes</span>
        <button className="chart-tool" onClick={() => void load()} disabled={loading}>{loading ? "Loading…" : "↻ Refresh"}</button>
      </div>
    </div>
    <div className="order-filters market-mover-filters" role="group" aria-label="Filter market movers">
      {[["all","All markets"],["gainers","Gainers"],["losers","Losers"]].map(([value,label]) => <button key={value} className={filter === value ? "filter-chip active" : "filter-chip"} onClick={() => setFilter(value)} aria-pressed={filter === value}>{label}</button>)}
    </div>
    {error && items.length === 0 ? <div className="history-empty"><b>Market quotes unavailable</b><p>{error}</p><button className="btn btn-secondary" onClick={() => void load()}>Retry</button></div>
      : loading && items.length === 0 ? <div className="history-empty">Loading simulated prices…</div>
      : visibleItems.length === 0 ? <div className="history-empty"><b>No instruments in this group</b><p>No fictional demo instruments currently match this filter.</p></div>
      : <div className="table-wrap"><table className="account-table market-quotes-table"><thead><tr><th>Instrument</th><th>Simulated price</th><th>Daily change</th><th>Venue</th><th>Session</th><th></th></tr></thead><tbody>
        {visibleItems.map(item => {
          const metadata = SYMBOLS.find(symbol => symbol.symbol === item.symbol);
          const quote = item.quote;
          return <tr key={item.symbol}>
            <td><div className="table-symbol"><b>{item.symbol.replace("-USD", "")}</b><small>{metadata?.name ?? item.symbol}</small><small className="market-sector-label">{metadata?.sector ?? "Fictional instrument"}</small></div></td>
            <td>{money(quote?.price ?? null, quote?.currency)}</td>
            <td className={quote?.changePercent == null ? "muted" : quote.changePercent >= 0 ? "positive" : "negative"}>{quote?.changePercent == null ? "—" : `${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%`}</td>
            <td>{quote?.exchange ?? "Unavailable"}</td>
            <td><span className="session-label">{quote?.marketState ?? item.error ?? "Unavailable"}</span></td>
            <td><Link href={`/markets?symbol=${encodeURIComponent(item.symbol)}`} className="text-link">Chart →</Link></td>
          </tr>;
        })}
      </tbody></table></div>}
    <div className="market-quotes-footer"><span>Fictional instruments · prices and changes are simulated.</span><Link href="/markets" className="text-link">Open market terminal →</Link></div>
  </section>;
}
