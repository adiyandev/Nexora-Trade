import { describe, expect, it } from "vitest";
import { DEMO_INSTRUMENTS, getDemoInstrument, getDemoLivePrice, getDemoPreviousClose } from "./demo-instruments";

describe("demo market instruments", () => {
  it("includes the fictional symbols from the trading terminal reference", () => {
    expect(DEMO_INSTRUMENTS.map(instrument => instrument.symbol)).toEqual([
      "OMNI", "VLT", "HALO", "BRIK", "PWN", "BLX", "BYTE", "CHIP", "MEDI",
      "LOOT", "OBBY", "SLRP", "ROBO", "LAND", "POWR", "DOMO", "INSR",
    ]);
  });

  it("provides unique symbols and valid illustrative quotes", () => {
    expect(new Set(DEMO_INSTRUMENTS.map(instrument => instrument.symbol)).size).toBe(DEMO_INSTRUMENTS.length);
    for (const instrument of DEMO_INSTRUMENTS) {
      expect(instrument.price).toBeGreaterThan(0);
      expect(Number.isFinite(getDemoPreviousClose(instrument))).toBe(true);
    }
  });


  it("replays the same simulated quote for the same timestamp", () => {
    const timestamp = 1_800_000_000_000;
    for (const instrument of DEMO_INSTRUMENTS) {
      expect(getDemoLivePrice(instrument, timestamp)).toBe(getDemoLivePrice(instrument, timestamp));
    }
  });

  it("keeps simulated quotes positive and within the documented illustrative movement bounds", () => {
    const timestamps = [0, 1_700_000_000_000, 1_800_000_000_000, 1_900_000_000_000];
    for (const instrument of DEMO_INSTRUMENTS) {
      for (const timestamp of timestamps) {
        const quote = getDemoLivePrice(instrument, timestamp);
        expect(Number.isFinite(quote)).toBe(true);
        expect(quote).toBeGreaterThan(0);
        expect(Math.abs(quote / instrument.price - 1)).toBeLessThan(0.002);
      }
    }
  });

  it("looks up demo symbols case-insensitively without accepting unknown symbols", () => {
    expect(getDemoInstrument("medi")?.name).toBe("Mediblox Health");
    expect(getDemoInstrument("NOTREAL")).toBeUndefined();
  });

  it("moves demo quotes smoothly over time without leaving the illustrative range", () => {
    const instrument = DEMO_INSTRUMENTS.find(item => item.symbol === "MEDI");
    expect(instrument).toBeDefined();
    if (!instrument) return;
    const firstPrice = getDemoLivePrice(instrument, 1_800_000_000_000);
    const nextPrice = getDemoLivePrice(instrument, 1_800_000_005_000);
    expect(nextPrice).not.toBe(firstPrice);
    expect(Math.abs(nextPrice / instrument.price - 1)).toBeLessThan(0.002);
  });
});
