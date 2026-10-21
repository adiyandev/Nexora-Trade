import { NextRequest, NextResponse } from "next/server";

const SYMBOLS = new Set([
  "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "AMD",
  "SPY", "QQQ", "BTC-USD", "ETH-USD",
]);
const RANGES: Record<string, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" },
  "5D": { range: "5d", interval: "15m" },
  "1M": { range: "1mo", interval: "1h" },
  "3M": { range: "3mo", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
};

export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get("symbol") || "AAPL").toUpperCase();
  const timeframe = (request.nextUrl.searchParams.get("timeframe") || "1D").toUpperCase();
  const config = RANGES[timeframe];

  if (!SYMBOLS.has(symbol)) {
    return NextResponse.json({ error: "Unsupported symbol." }, { status: 400 });
  }
  if (!config) {
    return NextResponse.json({ error: "Unsupported timeframe." }, { status: 400 });
  }

  try {
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
    url.searchParams.set("range", config.range);
    url.searchParams.set("interval", config.interval);
    url.searchParams.set("includePrePost", "false");
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 NexoraTrade/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "The market data provider is temporarily unavailable." }, { status: 502 });
    }

    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    if (!result?.timestamp?.length || !result?.indicators?.quote?.[0]) {
      return NextResponse.json({ error: "No candle data is available for this symbol right now." }, { status: 502 });
    }

    const quote = result.indicators.quote[0];
    const candles = result.timestamp.flatMap((time: number, index: number) => {
      const open = quote.open?.[index];
      const high = quote.high?.[index];
      const low = quote.low?.[index];
      const close = quote.close?.[index];
      const volume = quote.volume?.[index] ?? 0;
      if ([open, high, low, close].some((value) => typeof value !== "number" || !Number.isFinite(value))) return [];
      return [{ time, open, high, low, close, volume }];
    });
    const meta = result.meta || {};
    return NextResponse.json({
      symbol,
      timeframe,
      currency: meta.currency || (symbol.endsWith("-USD") ? "USD" : "USD"),
      exchange: meta.fullExchangeName || meta.exchangeName || "Market",
      price: meta.regularMarketPrice ?? candles[candles.length - 1]?.close ?? null,
      previousClose: meta.chartPreviousClose ?? meta.previousClose ?? null,
      marketState: meta.marketState || "UNKNOWN",
      fetchedAt: new Date().toISOString(),
      candles,
    }, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch {
    return NextResponse.json({ error: "Could not reach the market data provider. Please retry shortly." }, { status: 502 });
  }
}
