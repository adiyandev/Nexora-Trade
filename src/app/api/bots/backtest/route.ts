import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { DEMO_INSTRUMENTS, getDemoInstrument } from "@/lib/demo-instruments";
import { runSmaCrossoverBacktest } from "@/lib/backtest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  symbol: z.string().trim().toUpperCase().refine(symbol => DEMO_INSTRUMENTS.some(instrument => instrument.symbol === symbol)),
  fastPeriod: z.number().int().min(2).max(20).default(5),
  slowPeriod: z.number().int().min(10).max(60).default(20),
  maxPositionPercent: z.number().min(1).max(50).default(50),
}).refine(value => value.fastPeriod < value.slowPeriod, {
  message: "Fast moving-average period must be shorter than the slow period.",
  path: ["fastPeriod"],
});

export async function POST(request: NextRequest) {
  try {
    const { data, error } = await auth.getSession();
    if (error) return NextResponse.json({ error: "Could not verify the current session." }, { status: 503 });
    if (!data?.user?.id) return NextResponse.json({ error: "Sign in to use the strategy lab." }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid strategy configuration.", details: parsed.error.flatten() }, { status: 400 });
  const instrument = getDemoInstrument(parsed.data.symbol);
  if (!instrument) return NextResponse.json({ error: "Choose a fictional Nexora demo instrument." }, { status: 400 });

  try {
    const result = runSmaCrossoverBacktest(instrument, {
      fastPeriod: parsed.data.fastPeriod,
      slowPeriod: parsed.data.slowPeriod,
      initialBalance: 3000,
      maxPositionPercent: parsed.data.maxPositionPercent,
      feeBps: 10,
      slippageBps: 5,
      barCount: 240,
    });
    return NextResponse.json({ result, mode: "backtest", dataStatus: "simulated" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (cause) {
    console.error("Strategy backtest failed", cause);
    return NextResponse.json({ error: "Could not run this strategy backtest." }, { status: 400 });
  }
}
