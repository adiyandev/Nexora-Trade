import { describe, expect, it } from "vitest";
import { DEMO_INSTRUMENTS } from "./demo-instruments";
import { runSmaCrossoverBacktest } from "./backtest";

const config = {
  fastPeriod: 5, slowPeriod: 20, initialBalance: 3000,
  maxPositionPercent: 50, feeBps: 10, slippageBps: 5, barCount: 240,
};

describe("rule-based strategy backtest", () => {
  it("replays deterministically for the same instrument and config", () => {
    const instrument = DEMO_INSTRUMENTS[0];
    expect(runSmaCrossoverBacktest(instrument, config)).toEqual(runSmaCrossoverBacktest(instrument, config));
  });

  it("keeps the simulated portfolio finite and positive", () => {
    for (const instrument of DEMO_INSTRUMENTS) {
      const result = runSmaCrossoverBacktest(instrument, config);
      expect(Number.isFinite(result.finalEquity)).toBe(true);
      expect(result.finalEquity).toBeGreaterThan(0);
      expect(result.maxDrawdownPercent).toBeGreaterThanOrEqual(0);
      expect(result.maxDrawdownPercent).toBeLessThan(100);
      expect(result.feesPaid).toBeGreaterThanOrEqual(0);
      expect(result.equityCurve.length).toBeGreaterThan(0);
    }
  });

  it("rejects invalid periods and excessive risk settings", () => {
    expect(() => runSmaCrossoverBacktest(DEMO_INSTRUMENTS[0], { ...config, fastPeriod: 20, slowPeriod: 5 })).toThrow("Invalid backtest configuration");
    expect(() => runSmaCrossoverBacktest(DEMO_INSTRUMENTS[0], { ...config, maxPositionPercent: 101 })).toThrow("Invalid backtest configuration");
    expect(() => runSmaCrossoverBacktest(DEMO_INSTRUMENTS[0], { ...config, feeBps: 101 })).toThrow("Invalid backtest configuration");
  });
});
