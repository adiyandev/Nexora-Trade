"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { LiveCandlestickChart, type DemoTradeFill } from "@/components/live-candlestick-chart";
import { DEMO_INSTRUMENTS } from "@/lib/demo-instruments";

const INSTRUMENTS = DEMO_INSTRUMENTS.map(instrument => ({ ...instrument, demo: true as const }));
type Quote = {
  symbol: string;
  price: number;
  currency: string;
  exchange: string;
  marketState: string;
  quoteTime: number;
  fetchedAt: string;
  dataStatus: string;
};
type Account = {
  account: { id: string; name: string; initialBalance: number; cash: number; equity: number | null };
  positions: Array<{
    symbol: string;
    name?: string;
    quantity: number;
    averageEntryPrice: number;
    currentPrice?: number | null;
    marketValue?: number | null;
    unrealizedPnl?: number | null;
  }>;
};
type OrderResponse = {
  order?: { id: string; symbol: string; side: string; status: string; quantity: number; price: number; notional: number; quoteTime?: number };
  error?: string;
};

const money = (value: number, currency = "USD") => new Intl.NumberFormat("en-US", {
  style: "currency", currency, minimumFractionDigits: value < 1 ? 4 : 2, maximumFractionDigits: value < 1 ? 6 : 2,
}).format(value);
const formatWatchPrice = (value: number) => new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

function MarketSparkline({ changePercent, seed }: { changePercent: number; seed: number }) {
  const direction = changePercent >= 0 ? -1 : 1;
  const points = Array.from({ length: 12 }, (_, index) => {
    const progress = index / 11;
    const x = progress * 48;
    const y = 8 + Math.sin((progress * 4 + seed * 0.7) * Math.PI) * 2.5 + direction * progress * 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  return (
    <svg className="trade-market-spark" viewBox="0 0 48 18" aria-hidden="true">
      <polyline points={points} fill="none" stroke={changePercent >= 0 ? "#19d7a0" : "#f05d73"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Trade() {
  const [symbol, setSymbol] = useState("OBBY");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("1");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [confirmation, setConfirmation] = useState<OrderResponse["order"] | null>(null);
  const [latestFill, setLatestFill] = useState<DemoTradeFill | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [watchlistQuery, setWatchlistQuery] = useState("");

  const loadAccount = useCallback(async () => {
    setAccountLoading(true);
    try {
      const response = await fetch("/api/demo/account", { cache: "no-store" });
      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error(`Demo account could not be loaded (HTTP ${response.status}).`);
      }
      const payload = await response.json() as Account & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Demo account could not be loaded.");
      setAccount(payload);
      setAccountError("");
    } catch (cause) {
      setAccount(null);
      setAccountError(cause instanceof Error ? cause.message : "Demo account could not be loaded.");
    } finally {
      setAccountLoading(false);
    }
  }, []);

  useEffect(() => { void loadAccount(); }, [loadAccount]);

  const updateDemoQuote = useCallback((updatedSymbol: string, price: number, quoteTime: number) => {
    setQuote(current => current?.symbol === updatedSymbol
      ? { ...current, price, quoteTime, fetchedAt: new Date(quoteTime * 1000).toISOString(), marketState: "DEMO" }
      : current);
    setAccount(current => {
      if (!current) return current;
      const positions = current.positions.map(position => position.symbol === updatedSymbol
        ? {
            ...position,
            currentPrice: price,
            marketValue: position.quantity * price,
            unrealizedPnl: (price - position.averageEntryPrice) * position.quantity,
          }
        : position);
      const allPositionsValued = positions.every(position => position.currentPrice != null);
      const marketValue = positions.reduce((total, position) => total + (position.marketValue ?? 0), 0);
      return {
        ...current,
        account: { ...current.account, equity: allPositionsValued ? current.account.cash + marketValue : null },
        positions,
      };
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setQuote(null);
    setQuoteError("");
    setQuoteLoading(true);
    fetch(`/api/market/candles?symbol=${encodeURIComponent(symbol)}&timeframe=1m`, {
      cache: "no-store",
      signal: controller.signal,
    }).then(async response => {
      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error(`Market quote could not be loaded (HTTP ${response.status}).`);
      }
      const payload = await response.json() as Quote & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Market quote unavailable.");
      if (payload.symbol !== symbol || !Number.isFinite(payload.price) || payload.price <= 0) {
        throw new Error("The market simulation returned an invalid quote.");
      }
      setQuote(payload);
    }).catch(cause => {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setQuoteError(cause instanceof Error ? cause.message : "Market quote unavailable.");
    }).finally(() => {
      if (!controller.signal.aborted) setQuoteLoading(false);
    });
    return () => controller.abort();
  }, [symbol]);

  const selectedPosition = account?.positions.find(position => position.symbol === symbol);
  const parsedQuantity = Number(quantity);
  const estimatedValue = quote && Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? quote.price * parsedQuantity : null;
  const quantityValid = /^\d+(?:\.\d{1,12})?$/.test(quantity.trim()) && Number.isFinite(parsedQuantity) && parsedQuantity > 0 && parsedQuantity <= 1_000_000;
  const cashEnough = side !== "buy" || (estimatedValue !== null && account !== null && estimatedValue <= account.account.cash);
  const positionEnough = side !== "sell" || (selectedPosition !== undefined && quantityValid && parsedQuantity <= selectedPosition.quantity);
  const signedOut = accountError.toLowerCase().includes("sign in");

  async function submitOrder() {
    setOrderError("");
    setConfirmation(null);
    if (!account) {
      setOrderError(accountError || "Your demo account is not available.");
      return;
    }
    if (!quote || !quantityValid || !cashEnough || !positionEnough) {
      setOrderError("Review the quote, quantity, cash, and position constraints before submitting.");
      return;
    }
    const key = idempotencyKey || crypto.randomUUID();
    setIdempotencyKey(key);
    setSubmitting(true);
    try {
      const response = await fetch("/api/demo/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, side, quantity: quantity.trim(), idempotencyKey: key }),
      });
      const payload = await response.json() as OrderResponse;
      if (!response.ok || !payload.order) throw new Error(payload.error || "Demo order was rejected.");
      if (payload.order.side !== "buy" && payload.order.side !== "sell") throw new Error("The demo trading engine returned an invalid order side.");
      setConfirmation(payload.order);
      setLatestFill({
        id: payload.order.id,
        symbol: payload.order.symbol,
        side: payload.order.side,
        quantity: payload.order.quantity,
        price: payload.order.price,
        quoteTime: payload.order.quoteTime ?? Math.floor(Date.now() / 1000),
        time: payload.order.quoteTime ?? Math.floor(Date.now() / 1000),
      });
      setIdempotencyKey("");
      await loadAccount();
      window.dispatchEvent(new Event("demo-account-updated"));
    } catch (cause) {
      setOrderError(cause instanceof Error ? cause.message : "Demo order could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  const quoteAge = useMemo(() => {
    if (!quote?.quoteTime) return "Timestamp unavailable";
    const age = Math.max(0, Math.floor(Date.now() / 1000) - quote.quoteTime);
    if (age < 60) return "Quote timestamp under 1 min ago";
    if (age < 3600) return `Quote timestamp ${Math.floor(age / 60)} min ago`;
    return `Quote timestamp ${Math.floor(age / 3600)}h ago`;
  }, [quote]);

  const selectedInstrument = INSTRUMENTS.find(instrument => instrument.symbol === symbol) ?? INSTRUMENTS[0];
  const allocationPercent = Math.max(1, Math.min(100, side === "buy"
    ? account && estimatedValue !== null && account.account.cash > 0 ? Math.round(estimatedValue / account.account.cash * 100) : 25
    : selectedPosition && parsedQuantity > 0 ? Math.round(parsedQuantity / selectedPosition.quantity * 100) : 25));
  const filteredInstruments = INSTRUMENTS.filter(instrument => {
    const term = watchlistQuery.trim().toUpperCase();
    return !term || instrument.symbol.includes(term) || instrument.name.toUpperCase().includes(term);
  });

  return (
    <AppShell>
      <div className="trade-terminal">
        <div className="trade-terminal-layout">
          <aside className="trade-market-list" aria-label="Markets watchlist">
            <div className="trade-market-heading"><b>Markets</b><span>{INSTRUMENTS.length} symbols</span></div>
            <label className="trade-market-search">
              <span aria-hidden="true">⌕</span>
              <input aria-label="Filter markets" placeholder="Search symbol" value={watchlistQuery} onChange={event => setWatchlistQuery(event.currentTarget.value)} />
            </label>
            <div className="trade-market-items">
              {filteredInstruments.map((instrument, index) => (
                <button
                  key={instrument.symbol}
                  type="button"
                  className={symbol === instrument.symbol ? "trade-market-item selected" : "trade-market-item"}
                  onClick={() => { setSymbol(instrument.symbol); setOrderError(""); setConfirmation(null); }}
                  aria-pressed={symbol === instrument.symbol}
                >
                  <span className={`trade-market-icon tone-${index % 6}`}>{instrument.symbol.replace("-USD", "").slice(0, 1)}</span>
                  <span className="trade-market-name"><b>{instrument.symbol.replace("-USD", "")}</b><small>{instrument.name}</small></span>
                  <MarketSparkline changePercent={instrument.changePercent} seed={index} />
                  <span className="trade-market-quote"><b>{formatWatchPrice(instrument.price)}</b><small className={instrument.changePercent >= 0 ? "positive" : "negative"}>{instrument.changePercent >= 0 ? "+" : ""}{instrument.changePercent.toFixed(2)}%</small></span>
                </button>
              ))}
              {filteredInstruments.length === 0 && <p className="trade-market-empty">No matching symbols</p>}
            </div>
            <p className="trade-market-footnote">All displayed prices are simulated.</p>
          </aside>

          <section className="trade-chart-column" aria-label={`${symbol} market chart`}>
            <LiveCandlestickChart
              initialSymbol={symbol}
              initialTimeframe="5m"
              latestFill={latestFill}
              onSymbolChange={selected => { setSymbol(selected); setOrderError(""); setConfirmation(null); }}
              onDemoPriceChange={updateDemoQuote}
              terminal
            />
          </section>

          <section className="trade-ticket">
            <div className="trade-ticket-head">
              <div><span className="trade-eyebrow">ORDER TICKET</span><h2>{selectedInstrument.symbol}</h2></div>
              <span className="account-mode">DEMO</span>
            </div>

            <div className="trade-ticket-price">
              <span>{selectedInstrument.name}{selectedInstrument.demo ? " · Demo symbol" : ""}</span>
              <b>{quoteLoading ? "Loading quote…" : quote ? money(quote.price, quote.currency) : "—"}</b>
              <small>{quote ? selectedInstrument.demo ? "Illustrative simulated quote" : quoteAge : "Quote unavailable"}</small>
            </div>

            {account && <div className="trade-cash-strip">
              <span><small>Available cash</small><b>{money(account.account.cash)}</b></span>
              <span><small>Equity</small><b>{account.account.equity === null ? "—" : money(account.account.equity)}</b></span>
            </div>}

            <div className="field trade-symbol-field">
              <label htmlFor="trade-symbol">Instrument</label>
              <select id="trade-symbol" value={symbol} onChange={event => { setSymbol(event.target.value); setOrderError(""); setConfirmation(null); }}>
                {INSTRUMENTS.map(instrument => <option key={instrument.symbol} value={instrument.symbol}>{instrument.symbol} — {instrument.name}</option>)}
              </select>
            </div>

            <div className="trade-side-tabs" role="group" aria-label="Order side">
              <button type="button" className={side === "buy" ? "trade-side buy active" : "trade-side buy"} onClick={() => { setSide("buy"); setOrderError(""); setConfirmation(null); }} aria-pressed={side === "buy"}>Buy</button>
              <button type="button" className={side === "sell" ? "trade-side sell active" : "trade-side sell"} onClick={() => { setSide("sell"); setOrderError(""); setConfirmation(null); }} aria-pressed={side === "sell"}>Sell</button>
            </div>

            <div className="trade-order-types" role="group" aria-label="Order type">
              <button type="button" className="active" aria-pressed="true" disabled>Market</button>
              <button type="button" title="Limit orders are not enabled" disabled>Limit</button>
              <button type="button" title="Options are not available in the demo" disabled>Options</button>
            </div>

            <div className="field trade-quantity-field">
              <label htmlFor="trade-quantity">Quantity <span>(units)</span></label>
              <input id="trade-quantity" inputMode="decimal" autoComplete="off" value={quantity} onChange={event => { setQuantity(event.target.value); setOrderError(""); setConfirmation(null); }} aria-describedby="quantity-help" />
              <small id="quantity-help" className="field-help">Fractional quantities supported.</small>
            </div>
            <div className="trade-allocation-control">
              <input
                type="range"
                min="1"
                max="100"
                value={allocationPercent}
                style={{ background: `linear-gradient(90deg, #20d9a0 ${allocationPercent}%, #29343a ${allocationPercent}%)` }}
                aria-label={side === "buy" ? "Order size as percent of available cash" : "Order size as percent of open position"}
                disabled={!quote || !account || (side === "sell" && !selectedPosition)}
                onChange={event => {
                  if (!quote || !account) return;
                  const ratio = Number(event.currentTarget.value) / 100;
                  const units = side === "buy"
                    ? account.account.cash * (ratio === 1 ? 0.995 : ratio) / quote.price
                    : (selectedPosition?.quantity ?? 0) * ratio;
                  setQuantity(Number(units.toFixed(8)).toString());
                  setOrderError("");
                  setConfirmation(null);
                }}
              />
              <span>{allocationPercent}%</span>
            </div>
            <div className="trade-quantity-presets" aria-label="Quantity presets">
              {[0.25, 0.5, 0.75, 1].map(ratio => {
                const label = ratio === 1 ? "Max" : `${ratio * 100}%`;
                return (
                  <button
                    key={ratio}
                    type="button"
                    disabled={!quote || !account || (side === "sell" && !selectedPosition)}
                    title={side === "buy" ? `Use ${label} of available demo cash` : `Sell ${label} of this position`}
                    onClick={() => {
                      if (!quote || !account) return;
                      const units = side === "buy"
                        ? account.account.cash * (ratio === 1 ? 0.995 : ratio) / quote.price
                        : (selectedPosition?.quantity ?? 0) * ratio;
                      setQuantity(Number(units.toFixed(8)).toString());
                      setOrderError("");
                      setConfirmation(null);
                    }}
                  >{label}</button>
                );
              })}
            </div>

            <div className="trade-order-summary">
              <div><span>Order type</span><b>Market</b></div>
              <div><span>Order value</span><b>{estimatedValue === null ? "—" : money(estimatedValue, quote?.currency)}</b></div>
              {side === "sell" && <div><span>Available to sell</span><b>{selectedPosition ? selectedPosition.quantity.toLocaleString("en-US", { maximumFractionDigits: 12 }) : "0"} units</b></div>}
              <div><span>Market state</span><b>{quote?.marketState ?? "Unknown"}</b></div>
            </div>

            {quoteError && <div className="trade-alert error" role="status">{quoteError}</div>}
            {accountError && <div className="trade-alert" role="status">{accountError}{signedOut && <div className="trade-auth-links"><Link href="/auth/sign-in">Sign in</Link><Link href="/auth/sign-up">Create an account</Link></div>}</div>}
            {orderError && <div className="trade-alert error" role="alert">{orderError}</div>}
            {account && !cashEnough && <p className="trade-validation">Insufficient virtual cash for this estimated order.</p>}
            {!positionEnough && side === "sell" && <p className="trade-validation">Sell quantity exceeds your available position.</p>}
            {confirmation && <div className="trade-alert success" role="status">
              <b>Demo order filled</b>
              <span>{confirmation.side.toUpperCase()} {confirmation.quantity} {confirmation.symbol} at {money(confirmation.price, quote?.currency)}. Estimated value {money(confirmation.notional, quote?.currency)}.</span>
              <Link href="/orders">View order history →</Link>
            </div>}

            <button className={side === "buy" ? "btn trade-submit buy-submit" : "btn trade-submit sell-submit"} disabled={submitting || quoteLoading || accountLoading || !quote || !account || !quantityValid || !cashEnough || !positionEnough} onClick={() => void submitOrder()}>
              {submitting ? "Submitting…" : accountLoading ? "Loading account…" : quoteLoading ? "Loading quote…" : `${side === "buy" ? "Buy" : "Sell"} ${symbol}`}
            </button>
            <p className="trade-disclaimer">Simulated execution only. No real-money orders are placed.</p>
          </section>

          <section className="trade-positions-panel">
            <div className="trade-positions-heading">
              <div className="trade-panel-tabs"><b>Positions <span>{account?.positions.length ?? 0}</span></b><Link href="/orders">Orders</Link><Link href="/portfolio">History</Link></div>
              <Link href="/portfolio" className="trade-positions-link">Portfolio ↗</Link>
            </div>
            <div className="table-wrap">
              <table className="trade-positions-table">
                <thead><tr><th>Symbol</th><th>Side</th><th>Quantity</th><th>Avg. entry</th><th>Mark</th><th>Unrealized P&amp;L</th><th /></tr></thead>
                <tbody>
                  {account?.positions.map(position => (
                    <tr key={position.symbol}>
                      <td><span className="trade-position-symbol">{position.symbol}</span>{position.name && <small>{position.name}</small>}</td>
                      <td><span className="trade-position-side">Long</span></td>
                      <td>{position.quantity.toLocaleString("en-US", { maximumFractionDigits: 12 })}</td>
                      <td>{money(position.averageEntryPrice)}</td>
                      <td>{position.currentPrice == null ? "—" : money(position.currentPrice)}</td>
                      <td className={position.unrealizedPnl == null ? "" : position.unrealizedPnl >= 0 ? "positive" : "negative"}>{position.unrealizedPnl == null ? "—" : money(position.unrealizedPnl)}</td>
                      <td><button type="button" className="trade-position-action" onClick={() => { setSymbol(position.symbol); setSide("sell"); setOrderError(""); setConfirmation(null); }}>Sell</button></td>
                    </tr>
                  ))}
                  {!accountLoading && account?.positions.length === 0 && <tr><td colSpan={7} className="trade-empty-positions">No open positions yet. Submit a demo buy order to get started.</td></tr>}
                  {accountLoading && <tr><td colSpan={7} className="trade-empty-positions">Loading positions…</td></tr>}
                </tbody>
              </table>
            </div>
            {accountError && !account && <p className="trade-empty-positions">{signedOut ? "Sign in to access your demo positions." : "Positions are unavailable until your demo account loads."}</p>}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
