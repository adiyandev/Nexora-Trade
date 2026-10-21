export type Asset = { symbol: string; name: string; price: number; change: number; color: string; units: number };

// Clearly illustrative demo values, not a live market feed.
export const assets: Asset[] = [
  { symbol: "BTC", name: "Bitcoin", price: 67420.18, change: 2.84, color: "#f7931a", units: 0.42 },
  { symbol: "ETH", name: "Ethereum", price: 3528.64, change: 1.26, color: "#627eea", units: 3.8 },
  { symbol: "SOL", name: "Solana", price: 174.92, change: -0.92, color: "#8b6cf6", units: 24 },
  { symbol: "BNB", name: "BNB", price: 586.3, change: 0.48, color: "#e9b832", units: 6 },
  { symbol: "ADA", name: "Cardano", price: 0.442, change: -1.17, color: "#2563eb", units: 1200 },
  { symbol: "XRP", name: "XRP", price: 0.592, change: 0.74, color: "#6b7280", units: 900 },
];
export const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
