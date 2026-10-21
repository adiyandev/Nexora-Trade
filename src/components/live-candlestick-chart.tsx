"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
type MarketResponse = {
  symbol: string; timeframe: string; currency: string; exchange: string;
  price: number | null; previousClose: number | null; marketState: string;
  fetchedAt: string; candles: Candle[]; error?: string;
};
const WATCHLIST = [
  { symbol: "AAPL", name: "Apple", color: "#8b5cf6" },
  { symbol: "NVDA", name: "NVIDIA", color: "#76b900" },
  { symbol: "TSLA", name: "Tesla", color: "#e11d48" },
  { symbol: "MSFT", name: "Microsoft", color: "#2563eb" },
  { symbol: "AMZN", name: "Amazon", color: "#f59e0b" },
  { symbol: "GOOGL", name: "Alphabet", color: "#4285f4" },
  { symbol: "META", name: "Meta", color: "#0668e1" },
  { symbol: "AMD", name: "AMD", color: "#dc2626" },
  { symbol: "SPY", name: "S&P 500 ETF", color: "#0d9488" },
  { symbol: "QQQ", name: "Nasdaq 100 ETF", color: "#7c3aed" },
  { symbol: "BTC-USD", name: "Bitcoin", color: "#f7931a" },
  { symbol: "ETH-USD", name: "Ethereum", color: "#627eea" },
];
const TIMEFRAMES = ["1D", "5D", "1M", "3M", "1Y"] as const;
type Timeframe = typeof TIMEFRAMES[number];
const money = (value: number, digits = 2) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits,
}).format(value);
const dateLabel = (seconds: number, timeframe: Timeframe) => {
  const date = new Date(seconds * 1000);
  return timeframe === "1D" || timeframe === "5D"
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export function LiveCandlestickChart({ initialSymbol = "AAPL" }: { initialSymbol?: string }) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [data, setData] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState<Candle | null>(null);
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/market/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`, { cache: "no-store" });
      const json = await response.json() as MarketResponse;
      if (!response.ok) throw new Error(json.error || "Market data could not be loaded.");
      setData(json);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Market data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    setLoading(true);
    void load();
    const timer = window.setInterval(() => void load(true), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const chart = useMemo(() => {
    const candles = data?.candles ?? [];
    const width = 920, height = 390, left = 16, right = 76, top = 20, bottom = 58;
    const volumeHeight = 48;
    const plotBottom = height - bottom - volumeHeight;
    const plotHeight = plotBottom - top;
    const plotWidth = width - left - right;
    if (!candles.length) return { width, height, left, right, top, plotBottom, plotHeight, plotWidth, items: [] as Array<Candle & { x: number; yOpen: number; yClose: number; yHigh: number; yLow: number; bodyY: number; bodyH: number; volumeY: number; color: string }>, ticks: [] as number[], min: 0, max: 0 };
    const min = Math.min(...candles.map(c => c.low));
    const max = Math.max(...candles.map(c => c.high));
    const spread = max - min || max * 0.01 || 1;
    const paddedMin = min - spread * 0.06, paddedMax = max + spread * 0.06;
    const y = (price: number) => top + ((paddedMax - price) / (paddedMax - paddedMin)) * plotHeight;
    const maxVolume = Math.max(1, ...candles.map(c => c.volume));
    const step = plotWidth / candles.length;
    const bodyWidth = Math.max(2, Math.min(11, step * 0.68));
    const items = candles.map((c, i) => {
      const yOpen = y(c.open), yClose = y(c.close);
      return { ...c, x: left + step * (i + 0.5), yOpen, yClose, yHigh: y(c.high), yLow: y(c.low), bodyY: Math.min(yOpen, yClose), bodyH: Math.max(1, Math.abs(yClose - yOpen)), volumeY: plotBottom + 7 + (1 - c.volume / maxVolume) * volumeHeight, color: c.close >= c.open ? "#16a34a" : "#ef4444", bodyWidth };
    });
    return { width, height, left, right, top, plotBottom, plotHeight, plotWidth, items, min: paddedMin, max: paddedMax, ticks: [0, 1, 2, 3, 4].map(i => paddedMin + ((paddedMax - paddedMin) * i / 4)), bodyWidth };
  }, [data]);

  const selected = WATCHLIST.find(item => item.symbol === symbol) ?? WATCHLIST[0];
  const last = hovered ?? data?.candles[data.candles.length - 1];
  const change = data?.price != null && data.previousClose != null && data.previousClose !== 0
    ? ((data.price - data.previousClose) / data.previousClose) * 100 : null;
  const lastUpdated = data?.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";

  return <div className="live-market-layout">
    <aside className="live-watchlist card">
      <div className="section-head"><h2>Watchlist</h2><span className="live-dot" title="Market data feed" /></div>
      <div className="live-watch-items">{WATCHLIST.map(item => <button key={item.symbol} className={symbol === item.symbol ? "live-watch-item selected" : "live-watch-item"} onClick={() => { setSymbol(item.symbol); setHovered(null); }}>
        <span className="live-symbol-icon" style={{ background: item.color }}>{item.symbol.replace("-USD", "").slice(0, 1)}</span>
        <span className="live-watch-name"><b>{item.symbol.replace("-USD", "")}</b><small>{item.name}</small></span>
        <span className="live-watch-arrow">↗</span>
      </button>)}</div>
    </aside>
    <section className="card live-chart-card">
      <div className="live-instrument">
        <div className="live-instrument-title"><span className="live-symbol-icon large" style={{ background: selected.color }}>{symbol.replace("-USD", "").slice(0, 1)}</span><div><div className="live-symbol-line">{symbol.replace("-USD", "")} <span className="muted">/ USD</span></div><div className="muted live-company">{selected.name} · {data?.exchange ?? "Market data"}</div></div></div>
        <div className="live-price-block"><div className="live-current-price">{data?.price != null ? money(data.price, data.price < 1 ? 4 : 2) : "—"}</div><div className={change == null ? "muted" : change >= 0 ? "positive" : "negative"}>{change == null ? "Daily change unavailable" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}% today`}</div></div>
      </div>
      <div className="live-chart-toolbar"><div className="timeframe-tabs">{TIMEFRAMES.map(frame => <button key={frame} className={frame === timeframe ? "timeframe active" : "timeframe"} onClick={() => { setTimeframe(frame); setHovered(null); }}>{frame}</button>)}</div><div className="feed-status"><span className="live-dot" /> {loading ? "Updating…" : "Market feed"} <span className="muted">· {lastUpdated || "—"}</span></div></div>
      <div className="candle-chart-wrap">
        {error && <div className="market-error" role="status"><b>Market feed unavailable</b><span>{error}</span><button className="btn btn-secondary" onClick={() => void load()}>Retry</button></div>}
        {!error && loading && !data && <div className="chart-loading">Loading real market candles…</div>}
        {data && chart.items.length > 0 && <svg className="candle-chart" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={`${symbol} ${timeframe} candlestick chart with volume`}>
          {chart.ticks.map((tick, index) => {
            const y = chart.top + chart.plotHeight * index / 4;
            return <g key={index}><line x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} stroke="#e9eeeb" strokeDasharray="3 4" /><text x={chart.width - chart.right + 8} y={y + 4} fill="#738079" fontSize="11">{tick.toLocaleString("en-US", { maximumFractionDigits: data.price && data.price < 1 ? 5 : 2 })}</text></g>;
          })}
          <line x1={chart.left} x2={chart.width - chart.right} y1={chart.plotBottom} y2={chart.plotBottom} stroke="#e9eeeb" />
          {chart.items.map((candle, index) => <g key={candle.time} onMouseEnter={() => setHovered(candle)} onMouseLeave={() => setHovered(null)}>
            <title>{`${new Date(candle.time * 1000).toLocaleString()} · O ${candle.open} H ${candle.high} L ${candle.low} C ${candle.close} · Vol ${candle.volume.toLocaleString()}`}</title>
            <rect x={candle.x - chart.plotWidth / chart.items.length / 2} y={chart.top} width={Math.max(4, chart.plotWidth / chart.items.length)} height={chart.plotBottom - chart.top} fill="transparent" />
            <line x1={candle.x} x2={candle.x} y1={candle.yHigh} y2={candle.yLow} stroke={candle.color} strokeWidth="1.2" />
            <rect x={candle.x - (chart as typeof chart & {bodyWidth:number}).bodyWidth / 2} y={candle.bodyY} width={(chart as typeof chart & {bodyWidth:number}).bodyWidth} height={candle.bodyH} fill={candle.color} rx=".5" />
            <rect x={candle.x - Math.max(2, chart.plotWidth / chart.items.length / 2)} y={chart.plotBottom + 4} width={Math.max(1, chart.plotWidth / chart.items.length - 1)} height={chart.height - chart.plotBottom - 42} fill={candle.color} opacity=".16" />
          </g>)}
          {chart.items.filter((_, i) => i === 0 || i === Math.floor(chart.items.length / 4) || i === Math.floor(chart.items.length / 2) || i === Math.floor(chart.items.length * 3 / 4) || i === chart.items.length - 1).map(c => <text key={c.time} x={c.x} y={chart.height - 12} textAnchor="middle" fill="#738079" fontSize="11">{dateLabel(c.time, timeframe)}</text>)}
          {last && <g><line x1={chart.left} x2={chart.width - chart.right} y1={chart.top + ((chart.max - last.close) / (chart.max - chart.min || 1)) * chart.plotHeight} y2={chart.top + ((chart.max - last.close) / (chart.max - chart.min || 1)) * chart.plotHeight} stroke="#64748b" strokeDasharray="4 4" opacity=".8" /></g>}
        </svg>}
      </div>
      <div className="candle-ohlc">{last ? <><span><small>O</small>{money(last.open, last.open < 1 ? 4 : 2)}</span><span><small>H</small>{money(last.high, last.high < 1 ? 4 : 2)}</span><span><small>L</small>{money(last.low, last.low < 1 ? 4 : 2)}</span><span><small>C</small>{money(last.close, last.close < 1 ? 4 : 2)}</span><span><small>VOL</small>{last.volume.toLocaleString()}</span></> : <span className="muted">OHLC values will appear when candles load.</span>}</div>
      <div className="market-disclaimer">Real historical OHLC candles from Yahoo Finance chart data. Quotes may be delayed; refreshes every 30 seconds. Demo only — no real-money orders.</div>
    </section>
  </div>;
}
