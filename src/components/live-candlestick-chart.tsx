"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
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
  { symbol: "AAPL", name: "Apple Inc.", color: "#a78bfa" },
  { symbol: "NVDA", name: "NVIDIA Corporation", color: "#76b900" },
  { symbol: "TSLA", name: "Tesla, Inc.", color: "#f87171" },
  { symbol: "MSFT", name: "Microsoft Corporation", color: "#60a5fa" },
  { symbol: "AMZN", name: "Amazon.com, Inc.", color: "#fbbf24" },
  { symbol: "GOOGL", name: "Alphabet Inc.", color: "#4285f4" },
  { symbol: "META", name: "Meta Platforms, Inc.", color: "#38bdf8" },
  { symbol: "AMD", name: "Advanced Micro Devices", color: "#fb7185" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", color: "#2dd4bf" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", color: "#c4b5fd" },
  { symbol: "BTC-USD", name: "Bitcoin / USD", color: "#f7931a" },
  { symbol: "ETH-USD", name: "Ethereum / USD", color: "#818cf8" },
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

export function LiveCandlestickChart({ initialSymbol = "AAPL" }: { initialSymbol?: string }) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [data, setData] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [hovered, setHovered] = useState<Candle | null>(null);
  const [watchlistQuery, setWatchlistQuery] = useState("");
  const [savingWatchlist, setSavingWatchlist] = useState(false);
  const [watchlistNotice, setWatchlistNotice] = useState<{ kind: "success" | "error"; message: string; signIn?: boolean } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const currentDataRef = useRef<MarketResponse | null>(null);
  const chartKeyRef = useRef("");

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
    const container = chartContainerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: false,
      width: Math.max(320, container.clientWidth),
      height: 430,
      layout: {
        background: { type: ColorType.Solid, color: "#0e1114" },
        textColor: "#8b949e",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        fontSize: 11,
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: "#1a2025" },
        horzLines: { color: "#1a2025" },
      },
      rightPriceScale: { borderColor: "#242b30", scaleMargins: { top: 0.08, bottom: 0.24 } },
      timeScale: { borderColor: "#242b30", timeVisible: true, secondsVisible: false, rightOffset: 3 },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#65717a", width: 1, style: 3, labelBackgroundColor: "#242b30" },
        horzLine: { color: "#65717a", width: 1, style: 3, labelBackgroundColor: "#242b30" },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
      localization: { locale: "en-US" },
    });

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#16a34a",
      downColor: "#ef4444",
      borderUpColor: "#16a34a",
      borderDownColor: "#ef4444",
      wickUpColor: "#16a34a",
      wickDownColor: "#ef4444",
      priceLineVisible: true,
      lastValueVisible: true,
    });
    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: Math.max(320, Math.floor(entry.contentRect.width)),
      });
    });
    observer.observe(container);

    chart.subscribeCrosshairMove(param => {
      if (!param.time || typeof param.time !== "number") {
        setHovered(null);
        return;
      }
      const current = currentDataRef.current;
      setHovered(current?.candles.find(candle => candle.time === param.time) ?? null);
    });

    chartRef.current = chart;
    candleSeriesRef.current = candles;
    volumeSeriesRef.current = volume;

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    currentDataRef.current = data;
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !chartRef.current) return;
    if (!data) {
      candleSeriesRef.current.setData([]);
      volumeSeriesRef.current.setData([]);
      chartKeyRef.current = "";
      setHovered(null);
      return;
    }

    candleSeriesRef.current.setData(data.candles.map(candle => ({
      time: candle.time as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    })));
    volumeSeriesRef.current.setData(data.candles.map(candle => ({
      time: candle.time as UTCTimestamp,
      value: candle.volume,
      color: candle.close >= candle.open ? "rgba(22,163,74,0.32)" : "rgba(239,68,68,0.32)",
    })));
    const key = `${data.symbol}:${data.timeframe}`;
    if (chartKeyRef.current !== key) {
      chartRef.current.timeScale().fitContent();
      chartKeyRef.current = key;
    }
  }, [data]);

  const selected = WATCHLIST.find(item => item.symbol === symbol) ?? WATCHLIST[0];
  const latest = data?.candles[data.candles.length - 1] ?? null;
  const selectedCandle = hovered ?? latest;
  const change = data?.price != null && data.previousClose != null && data.previousClose !== 0
    ? data.price - data.previousClose : null;
  const changePercent = change != null && data?.previousClose
    ? (change / data.previousClose) * 100 : null;
  const currency = data?.currency ?? "USD";
  const quoteTime = data?.quoteTime ? formatDateTime(data.quoteTime, data.exchangeTimezone) : "Not supplied";
  const fetchedTime = data?.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

  return (
    <div className="live-market-layout">
      <aside className="live-watchlist">
        <div className="live-section-head"><span>MARKETS</span><span className="live-count">{WATCHLIST.length} symbols</span></div>
        <label className="market-search">
          <span aria-hidden="true">⌕</span>
          <input aria-label="Filter watchlist" placeholder="Find a symbol" value={watchlistQuery} onChange={event => setWatchlistQuery(event.currentTarget.value)} />
          <kbd>/</kbd>
        </label>
        <div className="live-watch-items">
          {WATCHLIST.filter(item => !watchlistQuery.trim() || item.symbol.includes(watchlistQuery.trim().toUpperCase()) || item.name.toUpperCase().includes(watchlistQuery.trim().toUpperCase())).map(item => (
            <button key={item.symbol} className={symbol === item.symbol ? "live-watch-item selected" : "live-watch-item"} onClick={() => setSymbol(item.symbol)} aria-pressed={symbol === item.symbol}>
              <span className="live-symbol-icon" style={{ background: item.color }}>{item.symbol.replace("-USD", "").slice(0, 1)}</span>
              <span className="live-watch-name"><b>{item.symbol.replace("-USD", "")}</b><small>{item.name}</small></span>
            </button>
          ))}
          {watchlistQuery.trim() && !WATCHLIST.some(item => item.symbol.includes(watchlistQuery.trim().toUpperCase()) || item.name.toUpperCase().includes(watchlistQuery.trim().toUpperCase())) && <div className="watchlist-empty">No matching symbols</div>}
        </div>
        <div className="watchlist-footnote">Prices and candles may be delayed. This is not an execution venue.</div>
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

        <div className="market-meta-row">
          <span className="data-status"><span className="status-square" /> HISTORICAL / POTENTIALLY DELAYED</span>
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
            <button className="chart-tool" onClick={() => chartRef.current?.timeScale().fitContent()} disabled={!data} title="Fit all candles to view">Fit</button>
            <button className="chart-tool" onClick={retry} disabled={loading} title="Refresh market data">{loading ? "Loading…" : "↻ Refresh"}</button>
          </div>
        </div>

        {watchlistNotice && <div className={watchlistNotice.kind === "success" ? "watchlist-save-notice success" : "watchlist-save-notice error"} role="status">
          <span>{watchlistNotice.message}</span>
          {watchlistNotice.signIn && <Link href="/auth/sign-in">Sign in</Link>}
        </div>}
        {error && <div className="market-error" role="status"><span>{error}</span><button className="chart-tool" onClick={retry}>Retry</button></div>}
        {!data && loading && <div className="chart-loading" aria-live="polite">Loading provider candles…</div>}
        {!data && !loading && !error && <div className="chart-loading">No market data available.</div>}
        <div ref={chartContainerRef} className="lightweight-chart" aria-label={`${symbol} candlestick chart with volume`} />
        <div className="candle-ohlc" aria-live="polite">
          {selectedCandle ? <>
            <span><small>O</small>{formatMoney(selectedCandle.open, currency)}</span>
            <span><small>H</small>{formatMoney(selectedCandle.high, currency)}</span>
            <span><small>L</small>{formatMoney(selectedCandle.low, currency)}</span>
            <span><small>C</small>{formatMoney(selectedCandle.close, currency)}</span>
            <span><small>VOL</small>{formatVolume(selectedCandle.volume)}</span>
            <span className="ohlc-time">{formatDateTime(selectedCandle.time, data?.exchangeTimezone ?? "UTC")}</span>
          </> : <span className="muted">OHLC values appear when provider candles load.</span>}
        </div>
        <div className="chart-footer">
          <span>Source: {data?.provider ?? "Yahoo Finance chart data"}</span>
          <span>Historical bars · refreshes every 30 seconds · demo only</span>
        </div>
      </section>
    </div>
  );
}
