import { NextRequest, NextResponse } from "next/server";

const SYMBOLS = new Set([
  "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "AMD",
  "SPY", "QQQ", "BTC-USD", "ETH-USD",
]);

// Yahoo Finance chart intervals and retention windows. These are historical
// quote bars; availability and delay depend on the instrument and exchange.
const TIMEFRAMES: Record<string, { range: string; interval: string }> = {
  "1m": { range: "1d", interval: "1m" },
  "5m": { range: "5d", interval: "5m" },
  "15m": { range: "1mo", interval: "15m" },
  "1h": { range: "3mo", interval: "1h" },
  "1D": { range: "1y", interval: "1d" },
  "1W": { range: "5y", interval: "1wk" },
  "1M": { range: "max", interval: "1mo" },
};

type YahooCandleResponse = {
  chart?: {
    error?: { description?: string; code?: string } | null;
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{
        open?: Array<number | null>;
        high?: Array<number | null>;
        low?: Array<number | null>;
        close?: Array<number | null>;
        volume?: Array<number | null>;
      }> };
      meta?: {
        currency?: string;
        fullExchangeName?: string;
        exchangeName?: string;
        instrumentType?: string;
        regularMarketPrice?: number;
        regularMarketTime?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        marketState?: string;
        dataGranularity?: string;
        exchangeTimezoneName?: string;
      };
    }> | null;
  };
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function GET(request: NextRequest) {
  const symbol = (request.nextUrl.searchParams.get("symbol") || "AAPL").toUpperCase();
  const timeframe = request.nextUrl.searchParams.get("timeframe") || "1D";
  const config = TIMEFRAMES[timeframe];

  if (!SYMBOLS.has(symbol)) {
    return NextResponse.json({ error: "Unsupported symbol. Choose a supported watchlist instrument." }, { status: 400 });
  }
  if (!config) {
    return NextResponse.json({ error: "Unsupported timeframe for this market data provider." }, { status: 400 });
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

    if (response.status === 429) {
      return NextResponse.json(
        { error: "The market data provider rate-limited this request. Wait briefly and retry." },
        { status: 429, headers: { "Retry-After": "30", "Cache-Control": "no-store" } },
      );
    }
    if (!response.ok) {
      return NextResponse.json({ error: "The market data provider is temporarily unavailable." }, { status: 502 });
    }

    const payload = await response.json() as YahooCandleResponse;
    const result = payload.chart?.result?.[0];
    if (payload.chart?.error || !result?.timestamp?.length || !result.indicators?.quote?.[0]) {
      return NextResponse.json({ error: "The provider returned no candle data for this symbol and timeframe." }, { status: 502 });
    }

    const quote = result.indicators.quote[0];
    const candles = result.timestamp.flatMap((time, index) => {
      const open = quote.open?.[index];
      const high = quote.high?.[index];
      const low = quote.low?.[index];
      const close = quote.close?.[index];
      const volume = quote.volume?.[index] ?? 0;
      if (![open, high, low, close].every(isFiniteNumber) || !Number.isSafeInteger(time) || time <= 0) return [];
      if (high < Math.max(open, close, low) || low > Math.min(open, close, high) || volume < 0) return [];
      return [{ time, open, high, low, close, volume: isFiniteNumber(volume) ? volume : 0 }];
    });

    if (candles.length === 0) {
      return NextResponse.json({ error: "The provider returned no valid OHLC candles for this request." }, { status: 502 });
    }

    const meta = result.meta ?? {};
    const price = isFiniteNumber(meta.regularMarketPrice) ? meta.regularMarketPrice : candles[candles.length - 1].close;
    const previousClose = isFiniteNumber(meta.chartPreviousClose)
      ? meta.chartPreviousClose
      : isFiniteNumber(meta.previousClose) ? meta.previousClose : null;

    return NextResponse.json({
      symbol,
      timeframe,
      currency: meta.currency ?? "USD",
      exchange: meta.fullExchangeName ?? meta.exchangeName ?? "Exchange not supplied",
      instrumentType: meta.instrumentType ?? "UNKNOWN",
      price,
      previousClose,
      marketState: meta.marketState ?? "UNKNOWN",
      exchangeTimezone: meta.exchangeTimezoneName ?? "UTC",
      quoteTime: isFiniteNumber(meta.regularMarketTime) ? meta.regularMarketTime : candles[candles.length - 1].time,
      fetchedAt: new Date().toISOString(),
      dataStatus: "historical_or_delayed",
      provider: "Yahoo Finance chart data",
      interval: config.interval,
      candles,
    }, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the market data provider. Please retry shortly." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
