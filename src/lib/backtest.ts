import { getDemoLivePrice, type DemoInstrument } from "./demo-instruments";

export type BacktestConfig = {
  fastPeriod: number;
  slowPeriod: number;
  initialBalance: number;
  maxPositionPercent: number;
  feeBps: number;
  slippageBps: number;
  barCount: number;
};

export type BacktestResult = {
  symbol: string;
  bars: number;
  fastPeriod: number;
  slowPeriod: number;
  initialBalance: number;
  finalEquity: number;
  totalReturnPercent: number;
  buyAndHoldReturnPercent: number;
  maxDrawdownPercent: number;
  trades: number;
  feesPaid: number;
  assumptions: { feeBps: number; slippageBps: number; maxPositionPercent: number };
  equityCurve: Array<{ index: number; equity: number }>;
};

function average(values: number[], end: number, period: number): number {
  let sum = 0;
  for (let index = end - period + 1; index <= end; index += 1) sum += values[index];
  return sum / period;
}

export function runSmaCrossoverBacktest(
  instrument: DemoInstrument,
  config: BacktestConfig,
  startTimestamp = Date.UTC(2025, 0, 1),
): BacktestResult {
  const { fastPeriod, slowPeriod, initialBalance, maxPositionPercent, feeBps, slippageBps, barCount } = config;
  if (!Number.isInteger(fastPeriod) || !Number.isInteger(slowPeriod) || fastPeriod < 2
    || slowPeriod <= fastPeriod || slowPeriod >= barCount || !Number.isInteger(barCount)
    || barCount < 30 || barCount > 1000 || !Number.isFinite(initialBalance) || initialBalance <= 0
    || !Number.isFinite(maxPositionPercent) || maxPositionPercent <= 0 || maxPositionPercent > 100
    || !Number.isFinite(feeBps) || feeBps < 0 || feeBps > 100
    || !Number.isFinite(slippageBps) || slippageBps < 0 || slippageBps > 100) {
    throw new Error("Invalid backtest configuration.");
  }

  const barIntervalMs = 5 * 60 * 1000;
  const prices = Array.from({ length: barCount }, (_, index) =>
    getDemoLivePrice(instrument, startTimestamp + index * barIntervalMs));
  let cash = initialBalance;
  let quantity = 0;
  let feesPaid = 0;
  let trades = 0;
  let pendingSignal: "buy" | "sell" | null = null;
  let peakEquity = initialBalance;
  let maxDrawdown = 0;
  const equityCurve: Array<{ index: number; equity: number }> = [];

  const feeRate = feeBps / 10_000;
  const slippageRate = slippageBps / 10_000;

  for (let index = slowPeriod; index < prices.length; index += 1) {
    const referencePrice = prices[index];

    // Signals formed at the previous bar's close execute only on this bar.
    if (pendingSignal === "buy" && quantity === 0) {
      const executionPrice = referencePrice * (1 + slippageRate);
      const budget = cash * maxPositionPercent / 100;
      const units = Math.floor((budget / (executionPrice * (1 + feeRate))) * 1e8) / 1e8;
      if (units > 0) {
        const notional = units * executionPrice;
        const fee = notional * feeRate;
        if (notional + fee <= cash) {
          cash -= notional + fee;
          quantity = units;
          feesPaid += fee;
          trades += 1;
        }
      }
    } else if (pendingSignal === "sell" && quantity > 0) {
      const executionPrice = referencePrice * (1 - slippageRate);
      const notional = quantity * executionPrice;
      const fee = notional * feeRate;
      cash += notional - fee;
      feesPaid += fee;
      quantity = 0;
      trades += 1;
    }
    pendingSignal = null;

    if (index < prices.length - 1) {
      const fastNow = average(prices, index, fastPeriod);
      const slowNow = average(prices, index, slowPeriod);
      const fastPrevious = average(prices, index - 1, fastPeriod);
      const slowPrevious = average(prices, index - 1, slowPeriod);
      if (fastPrevious <= slowPrevious && fastNow > slowNow) pendingSignal = "buy";
      else if (fastPrevious >= slowPrevious && fastNow < slowNow) pendingSignal = "sell";
    }

    const equity = cash + quantity * referencePrice;
    peakEquity = Math.max(peakEquity, equity);
    if (peakEquity > 0) maxDrawdown = Math.max(maxDrawdown, (peakEquity - equity) / peakEquity * 100);
    if (index % 4 === 0 || index === prices.length - 1) equityCurve.push({ index, equity: Number(equity.toFixed(2)) });
  }

  const finalEquity = cash + quantity * prices[prices.length - 1];
  const totalReturnPercent = (finalEquity / initialBalance - 1) * 100;
  const buyAndHoldReturnPercent = (prices[prices.length - 1] / prices[0] - 1) * 100;
  return {
    symbol: instrument.symbol, bars: barCount, fastPeriod, slowPeriod, initialBalance,
    finalEquity: Number(finalEquity.toFixed(2)),
    totalReturnPercent: Number(totalReturnPercent.toFixed(3)),
    buyAndHoldReturnPercent: Number(buyAndHoldReturnPercent.toFixed(3)),
    maxDrawdownPercent: Number(maxDrawdown.toFixed(3)),
    trades, feesPaid: Number(feesPaid.toFixed(2)),
    assumptions: { feeBps, slippageBps, maxPositionPercent },
    equityCurve,
  };
}
