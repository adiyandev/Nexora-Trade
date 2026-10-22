"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type PlotCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type PlotTradeMarker = {
  id: string;
  time: number;
  side: "buy" | "sell";
  price: number;
};

type MarketCandlestickPlotProps = {
  candles: PlotCandle[];
  tradeMarkers: PlotTradeMarker[];
  currency: string;
  timezone: string;
  timeframe: string;
  showAverage: boolean;
  onHover: (candle: PlotCandle | null) => void;
  resetKey: string;
  fitKey: number;
  zoomRequest: { key: number; direction: -1 | 1 };
};

const formatPrice = (value: number, currency: string) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency,
  minimumFractionDigits: value < 1 ? 4 : 2,
  maximumFractionDigits: value < 1 ? 6 : 2,
}).format(value);

const formatTime = (seconds: number, timezone: string, timeframe: string) => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      ...(timeframe === "1D" || timeframe === "1W" || timeframe === "1M"
        ? { month: "short", day: "2-digit" as const }
        : { hour: "2-digit", minute: "2-digit", hour12: false }),
    }).format(new Date(seconds * 1000));
  } catch {
    const date = new Date(seconds * 1000);
    return timeframe === "1D" || timeframe === "1W" || timeframe === "1M"
      ? date.toLocaleDateString([], { month: "short", day: "2-digit" })
      : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }
};

export function MarketCandlestickPlot({
  candles,
  tradeMarkers,
  currency,
  timezone,
  timeframe,
  showAverage,
  onHover,
  resetKey,
  fitKey,
  zoomRequest,
}: MarketCandlestickPlotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startOffset: number } | null>(null);
  const candlesRef = useRef(candles);
  const lastFitKeyRef = useRef(fitKey);
  candlesRef.current = candles;
  const clipId = useId().replace(/:/g, "");
  const [size, setSize] = useState({ width: 640, height: 360 });
  const [visibleCount, setVisibleCount] = useState(84);
  const [endOffset, setEndOffset] = useState(0);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; candle: PlotCandle } | null>(null);
  const visibleCountRef = useRef(visibleCount);
  visibleCountRef.current = visibleCount;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: Math.max(320, Math.floor(entry.contentRect.width)),
        height: Math.max(220, Math.floor(entry.contentRect.height)),
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        const delta = event.shiftKey ? event.deltaY : event.deltaX;
        const step = Math.max(1, Math.round(Math.abs(delta) / 40));
        setEndOffset(current => Math.max(
          0,
          Math.min(Math.max(0, candlesRef.current.length - visibleCountRef.current), current + Math.sign(delta) * step),
        ));
        return;
      }
      setEndOffset(0);
      setVisibleCount(current => Math.max(24, Math.min(candlesRef.current.length || 24, current + (event.deltaY > 0 ? 12 : -12))));
    };
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    setEndOffset(0);
    setVisibleCount(84);
    setCrosshair(null);
    onHover(null);
  }, [resetKey, onHover]);

  useEffect(() => {
    if (fitKey === lastFitKeyRef.current) return;
    lastFitKeyRef.current = fitKey;
    if (candlesRef.current.length === 0) return;
    setEndOffset(0);
    setVisibleCount(candlesRef.current.length);
  }, [fitKey]);

  useEffect(() => {
    if (zoomRequest.key === 0) return;
    setEndOffset(0);
    setVisibleCount(current => Math.max(
      24,
      Math.min(candlesRef.current.length || 24, current - zoomRequest.direction * 12),
    ));
  }, [zoomRequest.direction, zoomRequest.key]);

  const view = useMemo(() => {
    const end = Math.max(0, candles.length - endOffset);
    const start = Math.max(0, end - visibleCount);
    const visible = candles.slice(start, end);
    const right = size.width - 58;
    const top = 16;
    const bottom = size.height - 55;
    const volumeTop = size.height * 0.77;
    const volumeBottom = size.height - 25;
    const prices = visible.flatMap(candle => [candle.high, candle.low]);
    let minPrice = prices.length ? Math.min(...prices) : 0;
    let maxPrice = prices.length ? Math.max(...prices) : 1;
    const padding = Math.max((maxPrice - minPrice) * 0.08, Math.abs(maxPrice) * 0.0005, 0.000001);
    minPrice -= padding;
    maxPrice += padding;
    const maxVolume = Math.max(1, ...visible.map(candle => candle.volume));
    const priceY = (price: number) => bottom - ((price - minPrice) / (maxPrice - minPrice)) * (bottom - top);
    const candleWidth = Math.max(2, Math.min(10, ((right - 1) / Math.max(visible.length, 1)) * 0.62));
    const xAt = (index: number) => ((index + 0.5) / Math.max(visible.length, 1)) * right;
    const average = visible.map((candle, index) => {
      const absoluteIndex = start + index;
      const window = candles.slice(Math.max(0, absoluteIndex - 19), absoluteIndex + 1);
      return {
        x: xAt(index),
        y: priceY(window.reduce((sum, item) => sum + item.close, 0) / window.length),
      };
    });
    return { visible, start, right, top, bottom, volumeTop, volumeBottom, minPrice, maxPrice, maxVolume, priceY, candleWidth, xAt, average };
  }, [candles, endOffset, size.height, size.width, visibleCount]);

  function updateCrosshair(event: React.PointerEvent<SVGSVGElement>) {
    if (!view.visible.length || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(view.right, (event.clientX - rect.left) * size.width / rect.width));
    const index = Math.min(view.visible.length - 1, Math.max(0, Math.floor((x / view.right) * view.visible.length)));
    const candle = view.visible[index];
    const y = Math.max(view.top, Math.min(view.bottom, (event.clientY - rect.top) * size.height / rect.height));
    setCrosshair({ x, y, candle });
    onHover(candle);
  }

  const priceTicks = Array.from({ length: 6 }, (_, index) => (
    view.maxPrice - ((view.maxPrice - view.minPrice) * index) / 5
  ));
  const timeTickIndices = [0.08, 0.32, 0.56, 0.8, 0.96].map(fraction =>
    Math.min(view.visible.length - 1, Math.floor((view.visible.length - 1) * fraction)),
  );

  return (
    <div ref={containerRef} className="market-chart-native-wrap">
      <svg
        ref={svgRef}
        className="chart-native-svg"
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="img"
        aria-label="Interactive candlestick chart with moving average and volume"
        onPointerMove={event => {
          updateCrosshair(event);
          const drag = dragRef.current;
          if (drag && drag.pointerId === event.pointerId) {
            const delta = Math.round(((drag.startX - event.clientX) / Math.max(svgRef.current?.clientWidth ?? 1, 1)) * visibleCount);
            setEndOffset(Math.max(0, Math.min(Math.max(0, candles.length - visibleCount), drag.startOffset + delta)));
          }
        }}
        onPointerLeave={() => {
          if (!dragRef.current) {
            setCrosshair(null);
            onHover(null);
          }
        }}
        onPointerDown={event => {
          if (event.button !== 0) return;
          dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startOffset: endOffset };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={event => {
          if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
        }}
        onPointerCancel={() => { dragRef.current = null; }}
      >
        <defs>
          <clipPath id={`plot-price-clip-${clipId}`}>
            <rect x="0" y={view.top} width={view.right} height={view.bottom - view.top} />
          </clipPath>
          <clipPath id={`plot-volume-clip-${clipId}`}>
            <rect x="0" y={view.volumeTop} width={view.right} height={view.volumeBottom - view.volumeTop} />
          </clipPath>
        </defs>

        {priceTicks.map((price, index) => {
          const y = view.top + ((view.bottom - view.top) * index) / 5;
          return (
            <g key={`price-${index}`}>
              <line x1="0" x2={view.right} y1={y} y2={y} stroke="#1b2229" strokeWidth="1" />
              <text x={view.right + 8} y={y + 4} fill="#87919a" fontSize="10">{formatPrice(price, currency)}</text>
            </g>
          );
        })}

        {timeTickIndices.map(index => {
          const candle = view.visible[index];
          if (!candle) return null;
          const x = view.xAt(index);
          return (
            <g key={`time-${index}`}>
              <line x1={x} x2={x} y1={view.top} y2={view.volumeBottom} stroke="#151b21" strokeWidth="1" />
              <text x={x} y={size.height - 7} textAnchor="middle" fill="#87919a" fontSize="10">{formatTime(candle.time, timezone, timeframe)}</text>
            </g>
          );
        })}

        <line x1="0" x2={view.right} y1={view.volumeTop - 7} y2={view.volumeTop - 7} stroke="#30383f" />

        <g clipPath={`url(#plot-volume-clip-${clipId})`}>
          {view.visible.map((candle, index) => {
            const x = view.xAt(index);
            const height = (candle.volume / view.maxVolume) * (view.volumeBottom - view.volumeTop);
            return (
              <rect
                key={`volume-${candle.time}`}
                x={x - view.candleWidth / 2}
                y={view.volumeBottom - height}
                width={view.candleWidth}
                height={Math.max(1, height)}
                fill={candle.close >= candle.open ? "rgba(24,215,160,.34)" : "rgba(255,82,109,.34)"}
              />
            );
          })}
        </g>

        <g clipPath={`url(#plot-price-clip-${clipId})`}>
          {view.visible.map((candle, index) => {
            const x = view.xAt(index);
            const rising = candle.close >= candle.open;
            const color = rising ? "#18d7a0" : "#ff526d";
            const openY = view.priceY(candle.open);
            const closeY = view.priceY(candle.close);
            return (
              <g key={`candle-${candle.time}`}>
                <line x1={x} x2={x} y1={view.priceY(candle.high)} y2={view.priceY(candle.low)} stroke={color} strokeWidth="1" />
                <rect
                  x={x - view.candleWidth / 2}
                  y={Math.min(openY, closeY)}
                  width={view.candleWidth}
                  height={Math.max(1.5, Math.abs(openY - closeY))}
                  fill={color}
                  stroke={color}
                  strokeWidth=".6"
                />
              </g>
            );
          })}
          {showAverage && view.average.length > 1 && (
            <polyline
              points={view.average.map(point => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="#7968ff"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {tradeMarkers.map((marker, markerIndex) => {
            const first = view.visible[0];
            const last = view.visible[view.visible.length - 1];
            const timeframeSeconds = timeframe === "1m" ? 60 : timeframe === "5m" ? 300 : timeframe === "15m" ? 900
              : timeframe === "1h" ? 3600 : timeframe === "1D" ? 86400 : timeframe === "1W" ? 604800 : 2592000;
            if (!first || !last || marker.time < first.time || marker.time > last.time + timeframeSeconds) return null;
            let candleIndex = view.visible.findIndex((candle, index) =>
              marker.time >= candle.time && marker.time < (view.visible[index + 1]?.time ?? Number.POSITIVE_INFINITY),
            );
            if (candleIndex < 0) candleIndex = view.visible.length - 1;
            const x = view.xAt(candleIndex) + (markerIndex % 3 - 1) * 9;
            const y = Math.max(view.top + 10, Math.min(view.bottom - 10, view.priceY(marker.price)));
            const color = marker.side === "buy" ? "#18d7a0" : "#ff526d";
            return (
              <g key={marker.id} transform={`translate(${x},${y})`}>
                <title>{`${marker.side === "buy" ? "Buy" : "Sell"} fill at ${formatPrice(marker.price, currency)}`}</title>
                <circle r="8" fill="#09110f" stroke={color} strokeWidth="1.5" />
                <text textAnchor="middle" y="3.5" fill={color} fontWeight="800" fontSize="9">{marker.side === "buy" ? "B" : "S"}</text                >
                <title>Drag to pan. Scroll to zoom; Shift plus scroll pans horizontally.</title>
              </g>
            );
          })}
          {view.visible.length > 0 && (() => {
            const last = view.visible[view.visible.length - 1];
            const y = view.priceY(last.close);
            const rising = last.close >= last.open;
            return (
              <g>
                <line x1="0" x2={view.right} y1={y} y2={y} stroke={rising ? "#18d7a0" : "#ff526d"} strokeWidth="1" strokeDasharray="4 4" opacity=".8" />
                <rect x={view.right + 3} y={y - 10} width="53" height="20" rx="3" fill={rising ? "#138b6b" : "#c5445a"} />
                <text x={view.right + 29} y={y + 4} textAnchor="middle" fill="#fff" fontWeight="700" fontSize="10">{formatPrice(last.close, currency)}</text>
              </g>
            );
          })()}
        </g>

        {crosshair && (
          <g pointerEvents="none">
            <line x1={crosshair.x} x2={crosshair.x} y1={view.top} y2={view.volumeBottom} stroke="#8a949e" strokeWidth="1" strokeDasharray="3 4" />
            <line x1="0" x2={view.right} y1={crosshair.y} y2={crosshair.y} stroke="#8a949e" strokeWidth="1" strokeDasharray="3 4" />
            <rect x={view.right + 3} y={crosshair.y - 10} width="53" height="20" rx="3" fill="#303840" />
            <text x={view.right + 29} y={crosshair.y + 4} textAnchor="middle" fill="#fff" fontSize="10">{formatPrice(view.maxPrice - ((crosshair.y - view.top) / (view.bottom - view.top)) * (view.maxPrice - view.minPrice), currency)}</text>
          </g>
        )}
      </svg>
    </div>
  );
}
