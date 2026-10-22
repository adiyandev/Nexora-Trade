"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_INSTRUMENTS, getDemoInstrument, getDemoLivePrice } from "@/lib/demo-instruments";
import { MarketCandlestickPlot, type PlotCandle, type PlotTradeMarker } from "@/components/market-candlestick-plot";

type Candle = PlotCandle;
type MarketResponse = {
  symbol: string;
  timeframe: string;
  currency: string;
  exchange: string;
  instrumentType: string;
  price: number | null;
  previousClose: number | null;
  marketState: string;
  exchangeTimezone: string;
  quoteTime: number;
  fetchedAt: string;
  dataStatus: string;
  provider: string;
  interval: string;
  candles: Candle[];
  error?: string;
};
const WATCHLIST = [
  ...DEMO_INSTRUMENTS.map(item => ({ symbol: item.symbol, name: item.name, color: item.color })),
];
const TIMEFRAMES = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1H" },
  { value: "1D", label: "1D" },
  { value: "1W", label: "1W" },
  { value: "1M", label: "1M" },
] as const;
type Timeframe = typeof TIMEFRAMES[number]["value"];
export type DemoTradeFill = PlotTradeMarker & {
  symbol: string;
  quantity: number;
  quoteTime: number;
};
const formatMoney = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value);
const formatVolume = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString("en-US");
};
const formatDateTime = (seconds: number, timezone: string) => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(seconds * 1000));
  } catch {
    return new Date(seconds * 1000).toLocaleString();
  }
};

export function LiveCandlestickChart({
  initialSymbol = "MEDI",
  initialTimeframe = "1D",
  onSymbolChange,
  onDemoPriceChange,
  latestFill,
  terminal = false,
}: {
  initialSymbol?: string;
  initialTimeframe?: Timeframe;
  onSymbolChange?: (symbol: string) => void;
  onDemoPriceChange?: (symbol: string, price: number, quoteTime: number) => void;
  latestFill?: DemoTradeFill | null;
  terminal?: boolean;
}) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [data, setData] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [hovered, setHovered] = useState<Candle | null>(null);
  const [fitKey, setFitKey] = useState(0);
  const [showAverage, setShowAverage] = useState(true);
  const [zoomRequest, setZoomRequest] = useState<{ key: number; direction: -1 | 1 }>({ key: 0, direction: 1 });
  const [watchlistQuery, setWatchlistQuery] = useState("");
  const [savingWatchlist, setSavingWatchlist] = useState(false);
  const [watchlistNotice, setWatchlistNotice] = useState<{ kind: "success" | "error"; message: string; signIn?: boolean } | null>(null);
  const [tradeMarkers, setTradeMarkers] = useState<DemoTradeFill[]>([]);
  const processedFillIdRef = useRef<string | null>(null);
  const priceImpactsRef = useRef(new Map<string, { amount: number; createdAt: number }>());
  const onDemoPriceChangeRef = useRef(onDemoPriceChange);
  onDemoPriceChangeRef.current = onDemoPriceChange;

  const retry = useCallback(() => setRefreshKey(value => value + 1), []);

  async function saveToWatchlist() {
    setSavingWatchlist(true);
    setWatchlistNotice(null);
    try {
      const response = await fetch("/api/demo/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const payload = await response.json() as { error?: string; symbol?: string };
      if (!response.ok) throw new Error(payload.error || "Could not save this symbol.");
      setWatchlistNotice({ kind: "success", message: symbol + " saved to your watchlist." });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not save this symbol.";
      setWatchlistNotice({ kind: "error", message, signIn: message.toLowerCase().includes("sign in") });
    } finally {
      setSavingWatchlist(false);
    }
  }

  useEffect(() => {
    const requested = initialSymbol.toUpperCase();
    if (WATCHLIST.some(item => item.symbol === requested)) setSymbol(requested);
  }, [initialSymbol]);

  useEffect(() => {
    setWatchlistNotice(null);
  }, [symbol]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const fetchData = async (quiet: boolean) => {
      if (!quiet) {
        setLoading(true);
        setError("");
        setData(null);
        setHovered(null);
      }
      try {
        const response = await fetch(
          `/api/market/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = await response.json() as MarketResponse;
        if (!response.ok) {
          throw new Error(payload.error || "Market data could not be loaded.");
        }
        if (payload.symbol !== symbol || payload.timeframe !== timeframe || !Array.isArray(payload.candles)) {
          throw new Error("The provider response did not match the selected instrument and timeframe.");
        }
        if (active) {
          setData(payload);
          setError("");
        }
      } catch (cause) {
        if (active && !(cause instanceof DOMException && cause.name === "AbortError")) {
          setError(cause instanceof Error ? cause.message : "Market data could not be loaded.");
        }
      } finally {
        if (active && !quiet) setLoading(false);
        if (active && quiet) setLoading(false);
      }
    };

    void fetchData(false);
    const timer = window.setInterval(() => void fetchData(true), 30_000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [symbol, timeframe, refreshKey]);

  useEffect(() => {
    if (!latestFill || latestFill.id === processedFillIdRef.current) return;
    processedFillIdRef.current = latestFill.id;
    setTradeMarkers(current => [...current.filter(marker => marker.id !== latestFill.id), latestFill].slice(-100));

    const instrument = getDemoInstrument(latestFill.symbol);
    if (!instrument) return;
    const notional = latestFill.price * latestFill.quantity;
    const impact = latestFill.price * Math.min(0.0025, Math.max(0.0005, Math.sqrt(notional / 1_000) * 0.0005));
    const priceChange = latestFill.side === "buy" ? impact : -impact;
    const now = Date.now();
    priceImpactsRef.current.set(latestFill.symbol, { amount: priceChange, createdAt: now });
    const price = latestFill.price + priceChange;
    setData(current => {
      if (!current || current.symbol !== latestFill.symbol || current.candles.length === 0) return current;
      const candles = [...current.candles];
      const last = candles[candles.length - 1];
      const step = timeframe === "1m" ? 60 : timeframe === "5m" ? 300 : timeframe === "15m" ? 900
        : timeframe === "1h" ? 3600 : timeframe === "1D" ? 86400 : timeframe === "1W" ? 604800 : 2592000;
      const candleTime = Math.floor(latestFill.quoteTime / step) * step;
      if (candleTime > last.time) {
        candles.push({ time: candleTime, open: last.close, high: Math.max(last.close, price), low: Math.min(last.close, price), close: price, volume: Math.max(100, Math.round(notional * 100)) });
        if (candles.length > 120) candles.shift();
      } else {
        candles[candles.length - 1] = {
          ...last,
          high: Math.max(last.high, price),
          low: Math.min(last.low, price),
          close: price,
          volume: last.volume + Math.max(100, Math.round(notional * 100)),
        };
      }
      return { ...current, price, quoteTime: latestFill.quoteTime, fetchedAt: new Date(now).toISOString(), candles };
    });
    onDemoPriceChangeRef.current?.(latestFill.symbol, price, latestFill.quoteTime);
  }, [latestFill, timeframe]);

  useEffect(() => {
    const instrument = getDemoInstrument(symbol);
    if (!instrument) return;

    const timeframeSeconds: Record<Timeframe, number> = {
      "1m": 60,
      "5m": 300,
      "15m": 900,
      "1h": 3600,
      "1D": 86400,
      "1W": 604800,
      "1M": 2592000,
    };
    const step = timeframeSeconds[timeframe];
    const timer = window.setInterval(() => {
      const now = Date.now();
      const quoteTime = Math.floor(now / 1000);
      const basePrice = getDemoLivePrice(instrument, now);
      const impact = priceImpactsRef.current.get(symbol);
      const impactAge = impact ? Math.max(0, now - impact.createdAt) : 0;
      const impactStrength = impact ? Math.exp(-impactAge / 120_000) : 0;
      if (impact && impactStrength < 0.01) priceImpactsRef.current.delete(symbol);
      const price = basePrice + (impact ? impact.amount * impactStrength : 0);
      setData(current => {
        if (!current || current.dataStatus !== "demo" || current.candles.length === 0) return current;
        const candles = [...current.candles];
        const latest = candles[candles.length - 1];
        const candleTime = Math.floor(quoteTime / step) * step;
        if (candleTime > latest.time) {
          candles.push({ time: candleTime, open: latest.close, high: price, low: price, close: price, volume: 0 });
          if (candles.length > 120) candles.shift();
        } else {
          candles[candles.length - 1] = {
            ...latest,
            high: Math.max(latest.high, price),
            low: Math.min(latest.low, price),
            close: price,
            volume: latest.volume + Math.round(8 + Math.abs(Math.sin(now / 1700)) * 24),
          };
        }
        return { ...current, price, quoteTime, fetchedAt: new Date(now).toISOString(), candles };
      });
      onDemoPriceChangeRef.current?.(symbol, price, quoteTime);
    }, 850);

    return () => window.clearInterval(timer);
  }, [symbol, timeframe]);

  const selected = WATCHLIST.find(item => item.symbol === symbol) ?? WATCHLIST[0];
  const visibleTradeMarkers = tradeMarkers
    .filter(marker => marker.symbol === symbol)
    .map(({ id, time, side, price }) => ({ id, time, side, price }));
  const latest = data?.candles[data.candles.length - 1] ?? null;
  const selectedCandle = hovered ?? latest;
  const windowHigh = data?.candles.reduce((value, candle) => Math.max(value, candle.high), -Infinity) ?? null;
  const windowLow = data?.candles.reduce((value, candle) => Math.min(value, candle.low), Infinity) ?? null;
  const windowVolume = data?.candles.reduce((value, candle) => value + candle.volume, 0) ?? null;
  const change = data?.price != null && data.previousClose != null && data.previousClose !== 0
    ? data.price - data.previousClose : null;
  const changePercent = change != null && data?.previousClose
    ? (change / data.previousClose) * 100 : null;
  const currency = data?.currency ?? "USD";
  const quoteTime = data?.quoteTime ? formatDateTime(data.quoteTime, data.exchangeTimezone) : "Not supplied";
  const fetchedTime = data?.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
  const ohlcReadout = selectedCandle ? <>
    <span><small>O</small>{formatMoney(selectedCandle.open, currency)}</span>
    <span><small>H</small>{formatMoney(selectedCandle.high, currency)}</span>
    <span><small>L</small>{formatMoney(selectedCandle.low, currency)}</span>
    <span><small>C</small>{formatMoney(selectedCandle.close, currency)}</span>
    <span><small>VOL</small>{formatVolume(selectedCandle.volume)}</span>
    <span className="ohlc-time">{formatDateTime(selectedCandle.time, data?.exchangeTimezone ?? "UTC")}</span>
  </> : <span className="muted">OHLC values appear when simulated candles load.</span>;

  return (
    <div className={terminal ? "live-market-layout terminal-chart-layout" : "live-market-layout"}>
      <aside className="live-watchlist">
        <div className="live-section-head"><span>MARKETS</span><span className="live-count">{WATCHLIST.length} symbols</span></div>
        <label className="market-search">
          <span aria-hidden="true">⌕</span>
          <input aria-label="Filter watchlist" placeholder="Find a symbol" value={watchlistQuery} onChange={event => setWatchlistQuery(event.currentTarget.value)} />
          <kbd>/</kbd>
        </label>
        <div className="live-watch-items">
          {WATCHLIST.filter(item => !watchlistQuery.trim() || item.symbol.includes(watchlistQuery.trim().toUpperCase()) || item.name.toUpperCase().includes(watchlistQuery.trim().toUpperCase())).map(item => (
            <button key={item.symbol} className={symbol === item.symbol ? "live-watch-item selected" : "live-watch-item"} onClick={() => { setSymbol(item.symbol); onSymbolChange?.(item.symbol); }} aria-pressed={symbol === item.symbol}>
              <span className="live-symbol-icon" style={{ background: item.color }}>{item.symbol.replace("-USD", "").slice(0, 1)}</span>
              <span className="live-watch-name"><b>{item.symbol.replace("-USD", "")}</b><small>{item.name}</small></span>
            </button>
          ))}
          {watchlistQuery.trim() && !WATCHLIST.some(item => item.symbol.includes(watchlistQuery.trim().toUpperCase()) || item.name.toUpperCase().includes(watchlistQuery.trim().toUpperCase())) && <div className="watchlist-empty">No matching symbols</div>}
        </div>
        <div className="watchlist-footnote">Fictional demo prices only. Not an execution venue.</div>
      </aside>

      <section className="live-chart-panel">
        <div className="live-instrument">
          <div className="live-instrument-title">
            <span className="live-symbol-icon large" style={{ background: selected.color }}>{symbol.replace("-USD", "").slice(0, 1)}</span>
            <div>
              <div className="live-symbol-line">{symbol.replace("-USD", "")}<span className="instrument-currency"> / {currency}</span></div>
              <div className="live-company">{selected.name} <span>·</span> {data?.exchange ?? "Exchange data unavailable"}</div>
            </div>
          </div>
          <div className="live-price-block">
            <div className="live-current-price">{data?.price != null ? formatMoney(data.price, currency) : "—"}</div>
            <div className={changePercent == null ? "quote-change" : changePercent >= 0 ? "quote-change positive" : "quote-change negative"}>
              {changePercent == null || change == null ? "Change unavailable" : `${change >= 0 ? "+" : ""}${formatMoney(change, currency)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)`}
            </div>
          </div>
        </div>

        <div className="chart-market-stats" aria-label="Simulated market statistics">
          <div><small>ASSET CLASS</small><b>Demo equity</b></div>
          <div><small>PREV. CLOSE</small><b>{data?.previousClose != null ? formatMoney(data.previousClose, currency) : "—"}</b></div>
          <div><small>WINDOW HIGH</small><b>{windowHigh != null && Number.isFinite(windowHigh) ? formatMoney(windowHigh, currency) : "—"}</b></div>
          <div><small>WINDOW LOW</small><b>{windowLow != null && Number.isFinite(windowLow) ? formatMoney(windowLow, currency) : "—"}</b></div>
          <div><small>VOLUME</small><b>{windowVolume == null ? "—" : formatVolume(windowVolume)}</b></div>
        </div>

        <div className="market-meta-row">
          <span className="data-status"><span className="status-square" /> SIMULATED DEMO PRICES</span>
          <span>Session: <b>{data?.marketState ?? "Loading"}</b></span>
          <span>Quote time: <b>{quoteTime}</b></span>
          <span>Fetched: <b>{fetchedTime}</b></span>
        </div>

        <div className="live-chart-toolbar">
          <div className="timeframe-tabs" role="group" aria-label="Chart timeframe">
            {TIMEFRAMES.map(frame => (
              <button key={frame.value} className={frame.value === timeframe ? "timeframe active" : "timeframe"} onClick={() => setTimeframe(frame.value)} aria-pressed={frame.value === timeframe}>
                {frame.label}
              </button>
            ))}
          </div>
          <div className="chart-actions">
            <button className="chart-tool" onClick={() => void saveToWatchlist()} disabled={savingWatchlist} title="Save this symbol to your account watchlist">{savingWatchlist ? "Saving…" : "☆ Watchlist"}</button>
            <button className={showAverage ? "chart-tool active" : "chart-tool"} onClick={() => setShowAverage(value => !value)} aria-pressed={showAverage} title="Toggle the SMA 20 indicator">SMA 20</button>
            <button className="chart-tool" onClick={() => setFitKey(value => value + 1)} disabled={!data} title="Fit all candles to view">Fit</button>
            <button className="chart-tool" onClick={retry} disabled={loading} title="Refresh market data">{loading ? "Loading…" : "↻ Refresh"}</button>
          </div>
        </div>

        {watchlistNotice && <div className={watchlistNotice.kind === "success" ? "watchlist-save-notice success" : "watchlist-save-notice error"} role="status">
          <span>{watchlistNotice.message}</span>
          {watchlistNotice.signIn && <Link href="/auth/sign-in">Sign in</Link>}
        </div>}
        {error && <div className="market-error" role="status"><span>{error}</span><button className="chart-tool" onClick={retry}>Retry</button></div>}
        {!data && loading && <div className="chart-loading" aria-live="polite">Loading simulated candles…</div>}
        {!data && !loading && !error && <div className="chart-loading">No market data available.</div>}
        <div className="chart-plot-area">
          {terminal && showAverage && <div className="chart-indicator-legend"><span /> SMA 20</div>}
          {terminal && <div className="candle-ohlc chart-plot-ohlc" aria-live="polite">{ohlcReadout}</div>}
          <div className="chart-canvas-row">
            <div className="chart-drawing-tools" role="group" aria-label="Chart zoom controls">
              <button type="button" onClick={() => setZoomRequest(current => ({ key: current.key + 1, direction: 1 }))} disabled={!data} aria-label="Zoom in" title="Zoom in">+</button>
              <button type="button" onClick={() => setZoomRequest(current => ({ key: current.key + 1, direction: -1 }))} disabled={!data} aria-label="Zoom out" title="Zoom out">-</button>
              <button type="button" onClick={() => setFitKey(value => value + 1)} disabled={!data} aria-label="Fit all candles" title="Fit all candles">Fit</button>
            </div>
            <MarketCandlestickPlot
              candles={data?.candles ?? []}
              tradeMarkers={visibleTradeMarkers}
              currency={currency}
              timezone={data?.exchangeTimezone ?? "UTC"}
              timeframe={timeframe}
              showAverage={showAverage}
              onHover={setHovered}
              resetKey={`${symbol}:${timeframe}`}
              fitKey={fitKey}
              zoomRequest={zoomRequest}
            />
          </div>
        </div>
        {!terminal && <div className="candle-ohlc" aria-live="polite">{ohlcReadout}</div>}
        <div className="chart-footer">
          <span>Source: {data?.provider ?? "NexoraTrade demo market simulation"}</span>
          <span>{terminal ? "Filled trades add B/S markers and a short-lived local price impact" : "Illustrative demo candles · not live market data"}</span>
        </div>
      </section>
    </div>
  );
}
