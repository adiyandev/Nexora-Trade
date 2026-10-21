import "server-only";

const SUPPORTED_SYMBOLS = new Set([
  "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "AMD",
  "SPY", "QQQ", "BTC-USD", "ETH-USD",
]);

type ProviderResponse = {
  chart?: {
    error?: { description?: string; code?: string } | null;
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
      meta?: {
        currency?: string;
        fullExchangeName?: string;
        exchangeName?: string;
        regularMarketPrice?: number;
        regularMarketTime?: number;
        marketState?: string;
      };
    }> | null;
  };
};

export type MarketQuote = {
  symbol: string;
  price: number;
  currency: string;
  exchange: string;
  marketState: string;
  quoteTime: number;
  fetchedAt: string;
  provider: "Yahoo Finance chart data";
};

export async function fetchMarketQuote(inputSymbol: string): Promise<MarketQuote> {
  const symbol = inputSymbol.trim().toUpperCase();
  if (!SUPPORTED_SYMBOLS.has(symbol)) {
    throw new Error("Unsupported market symbol.");
  }

  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set("range", "1d");
  url.searchParams.set("interval", "1m");
  url.searchParams.set("includePrePost", "false");

  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 NexoraTrade/1.0" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 429) {
    throw new Error("The market data provider rate-limited this request. Wait briefly and retry.");
  }
  if (!response.ok) {
    throw new Error("The market data provider is temporarily unavailable.");
  }

  const payload = await response.json() as ProviderResponse;
  const result = payload.chart?.result?.[0];
  if (payload.chart?.error || !result) {
    throw new Error("The provider returned no quote for this instrument.");
  }

  const meta = result.meta ?? {};
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const lastValidIndex = closes.findLastIndex(value => typeof value === "number" && Number.isFinite(value));
  const latestClose = lastValidIndex >= 0 ? closes[lastValidIndex] : null;
  const quoteTime = Number.isSafeInteger(meta.regularMarketTime) && (meta.regularMarketTime ?? 0) > 0
    ? meta.regularMarketTime as number
    : lastValidIndex >= 0 ? timestamps[lastValidIndex] : null;
  const price = typeof meta.regularMarketPrice === "number" && Number.isFinite(meta.regularMarketPrice)
    ? meta.regularMarketPrice
    : latestClose;

  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0 || typeof quoteTime !== "number") {
    throw new Error("The provider did not return a valid price and timestamp.");
  }

  return {
    symbol,
    price,
    currency: meta.currency ?? "USD",
    exchange: meta.fullExchangeName ?? meta.exchangeName ?? "Exchange not supplied",
    marketState: meta.marketState ?? "UNKNOWN",
    quoteTime,
    fetchedAt: new Date().toISOString(),
    provider: "Yahoo Finance chart data",
  };
}
