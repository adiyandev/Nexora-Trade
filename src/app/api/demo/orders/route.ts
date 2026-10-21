import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/db";
import { fetchMarketQuote } from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const orderInput = z.object({
  symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{1,12}$/),
  side: z.enum(["buy", "sell"]),
  quantity: z.coerce.string().trim().regex(/^\d+(?:\.\d{1,12})?$/).refine(
    value => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 1_000_000,
    "Quantity must be greater than zero and no more than 1,000,000 units.",
  ),
  idempotencyKey: z.string().uuid(),
});

const executionResult = z.object({
  ok: z.boolean(),
  code: z.string().optional(),
  message: z.string().optional(),
  duplicate: z.boolean().optional(),
  accountId: z.string().optional(),
  orderId: z.string().optional(),
  status: z.string().optional(),
  symbol: z.string().optional(),
  side: z.string().optional(),
  quantity: z.union([z.string(), z.number()]).optional(),
  price: z.union([z.string(), z.number()]).optional(),
  notional: z.union([z.string(), z.number()]).optional(),
  realizedPnl: z.union([z.string(), z.number()]).optional(),
  availableCash: z.union([z.string(), z.number()]).optional(),
  positionQuantity: z.union([z.string(), z.number()]).optional(),
  quoteTime: z.number().optional(),
  marketState: z.string().optional(),
}).passthrough();

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    const { data, error } = await auth.getSession();
    if (error) return NextResponse.json({ error: "Could not verify the current session." }, { status: 503 });
    if (!data?.user?.id) return NextResponse.json({ error: "Sign in before submitting a demo order." }, { status: 401 });
    userId = data.user.id;
  } catch {
    return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
  }

  const database = db;
  if (!database) {
    return NextResponse.json({ error: "Demo trading storage is not configured. Set DATABASE_URL to the development database branch." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = orderInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid demo order.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { symbol, side, quantity, idempotencyKey } = parsed.data;
  let quote;
  try {
    quote = await fetchMarketQuote(symbol);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Market quote is unavailable.";
    const status = message.toLowerCase().includes("rate-limited") ? 429 : 502;
    return NextResponse.json({ error: message }, { status, headers: status === 429 ? { "Retry-After": "30" } : undefined });
  }

  try {
    const [row] = await database.select({
      result: sql<unknown>`execute_demo_market_order(
        ${userId},
        ${symbol},
        ${side},
        ${quantity}::numeric,
        ${idempotencyKey},
        ${quote.price}::numeric,
        ${quote.quoteTime}::bigint,
        ${quote.marketState}
      )`,
    });
    let rawResult: unknown = row?.result;
    if (typeof rawResult === "string") {
      try { rawResult = JSON.parse(rawResult) as unknown; } catch { rawResult = null; }
    }
    const outcome = executionResult.safeParse(rawResult);
    if (!outcome.success) {
      console.error("Demo order function returned an invalid result", outcome.error);
      return NextResponse.json({ error: "The demo trading engine returned an invalid response." }, { status: 500 });
    }

    const result = outcome.data;
    if (!result.ok) {
      const status = result.code === "UNAUTHORIZED" ? 401
        : result.code === "STALE_QUOTE" || result.code === "INSUFFICIENT_CASH" || result.code === "INSUFFICIENT_POSITION" ? 409
        : result.code === "INVALID_ORDER" || result.code === "INVALID_QUOTE" || result.code === "UNSUPPORTED_SYMBOL" ? 400
        : 503;
      return NextResponse.json({ error: result.message ?? "Demo order was rejected.", code: result.code }, { status });
    }

    return NextResponse.json({
      order: {
        id: result.orderId,
        symbol: result.symbol ?? symbol,
        side: result.side ?? side,
        status: result.status ?? "filled",
        quantity: Number(result.quantity ?? quantity),
        price: Number(result.price ?? quote.price),
        notional: Number(result.notional ?? Number(quantity) * quote.price),
        realizedPnl: Number(result.realizedPnl ?? 0),
        duplicate: result.duplicate ?? false,
        quoteTime: result.quoteTime ?? quote.quoteTime,
        marketState: result.marketState ?? quote.marketState,
      },
      account: {
        id: result.accountId,
        cash: result.availableCash === undefined ? undefined : Number(result.availableCash),
        positionQuantity: result.positionQuantity === undefined ? undefined : Number(result.positionQuantity),
      },
      quote: { price: quote.price, currency: quote.currency, exchange: quote.exchange, fetchedAt: quote.fetchedAt, provider: quote.provider },
    }, { status: result.duplicate ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Demo order execution failed", cause);
    return NextResponse.json({ error: "The demo trading engine is unavailable. Confirm the development migration has been applied." }, { status: 503 });
  }
}
