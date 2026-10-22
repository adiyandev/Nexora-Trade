import { DEMO_INSTRUMENTS } from "@/lib/demo-instruments";

export type Asset = { symbol: string; name: string; price: number; change: number; color: string; units: number };

// Clearly illustrative demo values, not a live market feed.
export const assets: Asset[] = DEMO_INSTRUMENTS.slice(0, 6).map((instrument, index) => ({
  symbol: instrument.symbol,
  name: instrument.name,
  price: instrument.price,
  change: instrument.changePercent,
  color: instrument.color,
  units: [12, 8, 25, 10, 4, 17][index] ?? 0,
}));
export const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
