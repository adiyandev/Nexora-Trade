import "server-only";
import { getDemoInstrument, getDemoLivePrice, getDemoPreviousClose } from "./demo-instruments";

export type MarketQuote = {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: "USD";
  exchange: "Nexora Demo Exchange";
  marketState: "DEMO";
  quoteTime: number;
  fetchedAt: string;
  provider: "NexoraTrade demo market simulation";
};

export async function fetchMarketQuote(inputSymbol: string): Promise<MarketQuote> {
  const symbol = inputSymbol.trim().toUpperCase();
  const instrument = getDemoInstrument(symbol);
  if (!instrument) {
    throw new Error("Only fictional Nexora demo instruments are supported.");
  }

  const quoteTime = Math.floor(Date.now() / 1000);
  const price = getDemoLivePrice(instrument, quoteTime * 1000);
  const previousClose = getDemoPreviousClose(instrument);
  const change = price - previousClose;

  return {
    symbol,
    price,
    previousClose,
    change,
    changePercent: (change / previousClose) * 100,
    currency: "USD",
    exchange: "Nexora Demo Exchange",
    marketState: "DEMO",
    quoteTime,
    fetchedAt: new Date().toISOString(),
    provider: "NexoraTrade demo market simulation",
  };
}
