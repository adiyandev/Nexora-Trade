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
