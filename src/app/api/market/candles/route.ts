import { NextRequest, NextResponse } from "next/server";
import { DEMO_INSTRUMENTS, getDemoInstrument, getDemoLivePrice, getDemoPreviousClose } from "@/lib/demo-instruments";

const TIMEFRAME_SECONDS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "1D": 86400,
  "1W": 604800,
  "1M": 2592000,
};

export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get("symbol") || "MEDI").toUpperCase();
  const timeframe = request.nextUrl.searchParams.get("timeframe") || "1D";
  const instrument = getDemoInstrument(symbol);
  const step = TIMEFRAME_SECONDS[timeframe];

  if (!instrument) {
    return NextResponse.json({ error: "Choose a fictional Nexora demo instrument." }, { status: 400 });
  }
  if (!step) {
    return NextResponse.json({ error: "Choose a supported chart timeframe." }, { status: 400 });
  }

  const lastTime = Math.floor(Date.now() / 1000 / step) * step;
  const price = getDemoLivePrice(instrument);
  const previousClose = getDemoPreviousClose(instrument);
  const candleCount = timeframe === "1D" ? 90 : timeframe === "1W" || timeframe === "1M" ? 72 : 120;
  const seed = DEMO_INSTRUMENTS.indexOf(instrument) + 1;
  let previous = previousClose;
  const candles = Array.from({ length: candleCount }, (_, index) => {
    const time = lastTime - (candleCount - index - 1) * step;
    const progress = index / (candleCount - 1);
    const phase = progress * Math.PI * (3 + seed % 3) + seed * 0.73;
    const trend = previousClose + (price - previousClose) * progress;
    const swing = Math.sin(phase) * previousClose * 0.0045 * Math.sin(Math.PI * progress);
    const ripple = Math.sin(progress * Math.PI * 24 + seed) * previousClose * 0.00065;
    const close = index === candleCount - 1 ? price : Math.max(0.01, trend + swing + ripple);
    const open = previous;
    const wick = previousClose * (0.0005 + Math.abs(Math.cos(phase * 1.31)) * 0.0009);
    previous = close;
    return {
      time,
      open,
      high: Math.max(open, close) + wick,
      low: Math.max(0.01, Math.min(open, close) - wick),
      close,
      volume: Math.round(12000 + Math.abs(Math.sin(phase * 0.53)) * 95000),
    };
  });

  return NextResponse.json({
    symbol,
    timeframe,
    currency: "USD",
    exchange: "Nexora Demo Exchange",
    instrumentType: "DEMO_EQUITY",
    price,
    previousClose,
    marketState: "DEMO",
    exchangeTimezone: "UTC",
    quoteTime: Math.floor(Date.now() / 1000),
    fetchedAt: new Date().toISOString(),
    dataStatus: "demo",
    provider: "NexoraTrade demo market simulation",
    interval: timeframe,
    candles,
  }, { headers: { "Cache-Control": "no-store" } });
}
