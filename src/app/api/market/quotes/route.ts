import { NextRequest, NextResponse } from "next/server";
import { fetchMarketQuote } from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_SYMBOLS = ["AAPL", "NVDA", "MSFT", "TSLA", "AMZN", "SPY"];
const MAX_SYMBOLS = 12;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("symbols");
  const symbols = [...new Set((raw ? raw.split(",") : DEFAULT_SYMBOLS)
    .map(symbol => symbol.trim().toUpperCase())
    .filter(Boolean))];

  if (symbols.length === 0 || symbols.length > MAX_SYMBOLS) {
    return NextResponse.json({ error: `Choose between 1 and ${MAX_SYMBOLS} symbols.` }, { status: 400 });
  }

  const quotes = await Promise.all(symbols.map(async symbol => {
    try {
      const quote = await fetchMarketQuote(symbol);
      return { symbol, quote, error: null };
    } catch (cause) {
      return {
        symbol,
        quote: null,
        error: cause instanceof Error ? cause.message : "Market quote unavailable.",
      };
    }
  }));

  const successfulQuotes = quotes.filter(item => item.quote !== null).length;
  return NextResponse.json({
    quotes,
    fetchedAt: new Date().toISOString(),
    provider: "Yahoo Finance chart data",
    dataStatus: "historical_or_delayed",
  }, {
    status: successfulQuotes > 0 ? 200 : 502,
    headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" },
  });
}
