"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";

const INSTRUMENTS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "AMZN", name: "Amazon.com, Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "META", name: "Meta Platforms, Inc." },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "BTC-USD", name: "Bitcoin / USD" },
  { symbol: "ETH-USD", name: "Ethereum / USD" },
];
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
  positions: Array<{ symbol: string; quantity: number; averageEntryPrice: number }>;
};
type OrderResponse = {
  order?: { id: string; symbol: string; side: string; status: string; quantity: number; price: number; notional: number };
  error?: string;
};

const money = (value: number, currency = "USD") => new Intl.NumberFormat("en-US", {
  style: "currency", currency, minimumFractionDigits: value < 1 ? 4 : 2, maximumFractionDigits: value < 1 ? 6 : 2,
}).format(value);

export default function Trade() {
  const [symbol, setSymbol] = useState("AAPL");
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
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const loadAccount = useCallback(async () => {
    setAccountLoading(true);
    try {
      const response = await fetch("/api/demo/account", { cache: "no-store" });
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

  useEffect(() => {
    const controller = new AbortController();
    setQuote(null);
    setQuoteError("");
    setQuoteLoading(true);
    fetch(`/api/market/candles?symbol=${encodeURIComponent(symbol)}&timeframe=1m`, {
      cache: "no-store",
      signal: controller.signal,
    }).then(async response => {
      const payload = await response.json() as Quote & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Market quote unavailable.");
      if (payload.symbol !== symbol || !Number.isFinite(payload.price) || payload.price <= 0) {
        throw new Error("The provider returned an invalid quote.");
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
      setConfirmation(payload.order);
      setIdempotencyKey("");
      await loadAccount();
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

  return (
    <AppShell>
      <PageHeading title="Demo trade" subtitle="Submit a simulated market order using a provider-sourced quote. No real-money trading." />
      <div className="trade-workspace">
        <section className="trade-ticket">
          <div className="trade-ticket-head">
            <div><span className="trade-eyebrow">ORDER TICKET</span><h2>Market order</h2></div>
            <span className="account-mode">DEMO ONLY</span>
          </div>

          {account && <div className="trade-cash-strip">
            <span><small>Available virtual cash</small><b>{money(account.account.cash)}</b></span>
            <span><small>Initial balance</small><b>{money(account.account.initialBalance)}</b></span>
          </div>}

          <div className="field">
            <label htmlFor="trade-symbol">Instrument</label>
            <select id="trade-symbol" value={symbol} onChange={event => { setSymbol(event.target.value); setOrderError(""); setConfirmation(null); }}>
              {INSTRUMENTS.map(instrument => <option key={instrument.symbol} value={instrument.symbol}>{instrument.symbol} — {instrument.name}</option>)}
            </select>
          </div>

          <div className="trade-side-tabs" role="group" aria-label="Order side">
            <button type="button" className={side === "buy" ? "trade-side buy active" : "trade-side buy"} onClick={() => { setSide("buy"); setOrderError(""); setConfirmation(null); }} aria-pressed={side === "buy"}>Buy</button>
            <button type="button" className={side === "sell" ? "trade-side sell active" : "trade-side sell"} onClick={() => { setSide("sell"); setOrderError(""); setConfirmation(null); }} aria-pressed={side === "sell"}>Sell</button>
          </div>

          <div className="field">
            <label htmlFor="trade-quantity">Quantity (units)</label>
            <input id="trade-quantity" inputMode="decimal" autoComplete="off" value={quantity} onChange={event => { setQuantity(event.target.value); setOrderError(""); setConfirmation(null); }} aria-describedby="quantity-help" />
            <small id="quantity-help" className="field-help">Fractional quantities supported up to 12 decimal places.</small>
          </div>

          <div className="quote-summary">
            <div><span>Provider quote</span><b>{quoteLoading ? "Loading…" : quote ? money(quote.price, quote.currency) : "Unavailable"}</b></div>
            <div><span>Estimated order value</span><b>{estimatedValue === null ? "—" : money(estimatedValue, quote?.currency)}</b></div>
            <div><span>Quote timestamp</span><b>{quoteAge}</b></div>
            <div><span>Market state</span><b>{quote?.marketState ?? "Unknown"}</b></div>
            {side === "sell" && <div><span>Available to sell</span><b>{selectedPosition ? selectedPosition.quantity.toLocaleString("en-US", { maximumFractionDigits: 12 }) : "0"} units</b></div>}
          </div>

          {quoteError && <div className="trade-alert error" role="status">{quoteError}</div>}
          {accountError && <div className="trade-alert" role="status">{accountError}{signedOut && <div className="trade-auth-links"><Link href="/auth/sign-in">Sign in</Link><Link href="/auth/sign-up">Create an account</Link></div>}</div>}
          {orderError && <div className="trade-alert error" role="alert">{orderError}</div>}
          {confirmation && <div className="trade-alert success" role="status">
            <b>Demo order filled</b>
            <span>{confirmation.side.toUpperCase()} {confirmation.quantity} {confirmation.symbol} at {money(confirmation.price, quote?.currency)}. Estimated value {money(confirmation.notional, quote?.currency)}.</span>
            <Link href="/orders">View order history →</Link>
          </div>}

          <button className={side === "buy" ? "btn trade-submit buy-submit" : "btn trade-submit sell-submit"} disabled={submitting || quoteLoading || accountLoading || !quote || !account || !quantityValid || !cashEnough || !positionEnough} onClick={() => void submitOrder()}>
            {submitting ? "Submitting…" : accountLoading ? "Loading account…" : quoteLoading ? "Loading quote…" : `Submit demo ${side} order`}
          </button>
          <p className="trade-disclaimer">Execution is simulated server-side at the provider quote returned for this request. Quotes can be delayed; this is educational paper trading, not a brokerage or investment advice.</p>
        </section>

        <aside className="trade-side-panel">
          <section className="trade-panel">
            <span className="trade-eyebrow">ORDER REVIEW</span>
            <h3>{side === "buy" ? "Buy" : "Sell"} {symbol}</h3>
            <div className="trade-review-row"><span>Order type</span><b>Market</b></div>
            <div className="trade-review-row"><span>Quantity</span><b>{quantityValid ? parsedQuantity.toLocaleString("en-US", { maximumFractionDigits: 12 }) : "—"}</b></div>
            <div className="trade-review-row"><span>Reference price</span><b>{quote ? money(quote.price, quote.currency) : "—"}</b></div>
            <div className="trade-review-row"><span>Estimated value</span><b>{estimatedValue === null ? "—" : money(estimatedValue, quote?.currency)}</b></div>
            <div className="trade-review-row"><span>Execution</span><b>Simulated</b></div>
            {!cashEnough && <p className="trade-validation">Insufficient virtual cash for this estimated order.</p>}
            {!positionEnough && side === "sell" && <p className="trade-validation">Sell quantity exceeds your available position.</p>}
          </section>
          <section className="trade-panel">
            <span className="trade-eyebrow">EXECUTION RULES</span>
            <h3>Before you submit</h3>
            <ul className="trade-rules">
              <li>Quotes are fetched by the server from the market-data provider.</li>
              <li>Server-side checks enforce cash, position size, quote age, and duplicate submission protection.</li>
              <li>Market orders fill immediately in this simulator; limit orders are not enabled.</li>
              <li>Every fill updates your virtual cash, position, and order ledger together.</li>
            </ul>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
