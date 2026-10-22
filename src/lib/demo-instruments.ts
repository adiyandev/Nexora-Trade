export type DemoInstrument = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  color: string;
};

export const DEMO_INSTRUMENTS: DemoInstrument[] = [
  { symbol: "OMNI", name: "OmniCore Holdings", price: 83.42, changePercent: 1.14, color: "#21c9a0" },
  { symbol: "VLT", name: "Vaultline Capital", price: 126.7, changePercent: 0.82, color: "#21c9a0" },
  { symbol: "HALO", name: "Halo Aerospace", price: 48.35, changePercent: -0.63, color: "#f5bc35" },
  { symbol: "BRIK", name: "BrikBank Financial", price: 59.77, changePercent: -1.88, color: "#f04b63" },
  { symbol: "PWN", name: "Pwnsoft", price: 690.23, changePercent: 0.57, color: "#21c9a0" },
  { symbol: "BLX", name: "Bloxon Energy", price: 256.23, changePercent: 1.57, color: "#21c9a0" },
  { symbol: "BYTE", name: "Bytewise Cloud", price: 442.08, changePercent: -0.02, color: "#f04b63" },
  { symbol: "CHIP", name: "Brickchip Semis", price: 776.72, changePercent: 1.63, color: "#21c9a0" },
  { symbol: "MEDI", name: "Mediblox Health", price: 95.78, changePercent: -0.26, color: "#f04b63" },
  { symbol: "LOOT", name: "Lootbank Corp", price: 213.77, changePercent: 2.56, color: "#21c9a0" },
  { symbol: "OBBY", name: "Obby Dynamics", price: 562.52, changePercent: 1.25, color: "#21c9a0" },
  { symbol: "SLRP", name: "Slurp Beverages", price: 87.61, changePercent: 0.94, color: "#21c9a0" },
  { symbol: "ROBO", name: "Robotix Automation", price: 243.51, changePercent: 1.87, color: "#21c9a0" },
  { symbol: "LAND", name: "Landmark REIT", price: 115.5, changePercent: 0.39, color: "#21c9a0" },
  { symbol: "POWR", name: "Powergrid Services", price: 74.49, changePercent: 1.01, color: "#21c9a0" },
  { symbol: "DOMO", name: "Domino Crown Lux.", price: 1009.57, changePercent: 2.29, color: "#f04b63" },
  { symbol: "INSR", name: "InSure Financial", price: 130.93, changePercent: 0.82, color: "#21c9a0" },
];

export function getDemoInstrument(symbol: string): DemoInstrument | undefined {
  return DEMO_INSTRUMENTS.find(instrument => instrument.symbol === symbol.toUpperCase());
}

export function getDemoPreviousClose(instrument: DemoInstrument): number {
  return instrument.price / (1 + instrument.changePercent / 100);
}

export function getDemoLivePrice(instrument: DemoInstrument, timestamp = Date.now()): number {
  const seed = DEMO_INSTRUMENTS.indexOf(instrument) + 1;
  const seconds = timestamp / 1000;
  const movement = Math.sin(seconds * 0.67 + seed) * 0.00045
    + Math.sin(seconds * 0.19 + seed * 1.7) * 0.0007;
  return instrument.price * (1 + movement);
}
