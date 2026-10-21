import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/db";
import { assets, watchlistItems, watchlists } from "@/db/schema";
import { fetchMarketQuote } from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getUserId() {
  try {
    const { data, error } = await auth.getSession();
    if (error) return { userId: null, status: 503 as const, error: "Could not verify the current session." };
    if (!data?.user?.id) return { userId: null, status: 401 as const, error: "Sign in to manage your watchlist." };
    return { userId: data.user.id, status: 200 as const, error: "" };
  } catch {
    return { userId: null, status: 503 as const, error: "Authentication is temporarily unavailable." };
  }
}

async function getOrCreateWatchlist(userId: string) {
  if (!db) throw new Error("Watchlist storage is not configured.");
  await db.insert(watchlists).values({ userId }).onConflictDoNothing({ target: [watchlists.userId, watchlists.name] });
  const [watchlist] = await db.select().from(watchlists).where(and(eq(watchlists.userId, userId), eq(watchlists.name, "My watchlist"))).limit(1);
  if (!watchlist) throw new Error("Could not initialize the watchlist.");
  return watchlist;
}

export async function GET() {
  const session = await getUserId();
  if (!session.userId) return NextResponse.json({ error: session.error }, { status: session.status });
  if (!db) return NextResponse.json({ error: "Watchlist storage is not configured." }, { status: 503 });

  try {
    const watchlist = await getOrCreateWatchlist(session.userId);
    const rows = await db.select({
      id: watchlistItems.id,
      symbol: assets.symbol,
      name: assets.name,
      createdAt: watchlistItems.createdAt,
    }).from(watchlistItems)
      .innerJoin(assets, eq(assets.id, watchlistItems.assetId))
      .where(eq(watchlistItems.watchlistId, watchlist.id))
      .orderBy(watchlistItems.createdAt);

    const items = await Promise.all(rows.map(async item => {
      try {
        const quote = await fetchMarketQuote(item.symbol);
        return { ...item, quote, quoteError: null };
      } catch (cause) {
        return { ...item, quote: null, quoteError: cause instanceof Error ? cause.message : "Quote unavailable." };
      }
    }));
    return NextResponse.json({ watchlistId: watchlist.id, items }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Failed to load watchlist", cause);
    return NextResponse.json({ error: "Could not load your watchlist. Verify the development database migration." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getUserId();
  if (!session.userId) return NextResponse.json({ error: session.error }, { status: session.status });
  if (!db) return NextResponse.json({ error: "Watchlist storage is not configured." }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = z.object({ symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{1,12}$/) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid market symbol." }, { status: 400 });

  try {
    const watchlist = await getOrCreateWatchlist(session.userId);
    const [asset] = await db.select().from(assets).where(and(eq(assets.symbol, parsed.data.symbol), eq(assets.isActive, true))).limit(1);
    if (!asset) return NextResponse.json({ error: "This instrument is not supported." }, { status: 400 });
    await db.insert(watchlistItems).values({ watchlistId: watchlist.id, assetId: asset.id })
      .onConflictDoNothing({ target: [watchlistItems.watchlistId, watchlistItems.assetId] });
    return NextResponse.json({ added: true, symbol: asset.symbol }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Failed to add watchlist item", cause);
    return NextResponse.json({ error: "Could not save the watchlist item." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getUserId();
  if (!session.userId) return NextResponse.json({ error: session.error }, { status: session.status });
  if (!db) return NextResponse.json({ error: "Watchlist storage is not configured." }, { status: 503 });
  const symbol = (request.nextUrl.searchParams.get("symbol") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{1,12}$/.test(symbol)) return NextResponse.json({ error: "Provide a valid market symbol." }, { status: 400 });

  try {
    const watchlist = await getOrCreateWatchlist(session.userId);
    const [asset] = await db.select({ id: assets.id }).from(assets).where(eq(assets.symbol, symbol)).limit(1);
    if (!asset) return NextResponse.json({ error: "Instrument not found." }, { status: 404 });
    await db.delete(watchlistItems).where(and(eq(watchlistItems.watchlistId, watchlist.id), eq(watchlistItems.assetId, asset.id)));
    return NextResponse.json({ removed: true, symbol }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Failed to remove watchlist item", cause);
    return NextResponse.json({ error: "Could not remove the watchlist item." }, { status: 503 });
  }
}
