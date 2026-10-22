import { and, desc, eq, gt, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/db";
import { assets, demoAccounts, fills, ledgerEntries, orders, portfolioSnapshots, positions } from "@/db/schema";
import { fetchMarketQuote } from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let userId: string;
  try {
    const { data, error } = await auth.getSession();
    if (error) return NextResponse.json({ error: "Could not verify the current session." }, { status: 503 });
    if (!data?.user?.id) return NextResponse.json({ error: "Sign in to access your demo account." }, { status: 401 });
    userId = data.user.id;
  } catch {
    return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
  }

  const database = db;
  if (!database) {
    return NextResponse.json({ error: "Demo account storage is not configured. Configure DATABASE_URL or DATABASE_URL_UNPOOLED for this deployment." }, { status: 503 });
  }

  try {
    await database.insert(demoAccounts).values({ userId }).onConflictDoNothing({ target: demoAccounts.userId });
    const [account] = await database.select().from(demoAccounts).where(eq(demoAccounts.userId, userId)).limit(1);
    if (!account) {
      return NextResponse.json({ error: "Could not initialize your demo account." }, { status: 503 });
    }

    const [cashRow] = await database.select({
      total: sql<string>`coalesce(sum(${ledgerEntries.amount}), 0)::text`,
    }).from(ledgerEntries).where(eq(ledgerEntries.accountId, account.id));
    const [realizedRow] = await database.select({
      total: sql<string>`coalesce(sum((metadata->>'realizedPnl')::numeric), 0)::text`,
    }).from(ledgerEntries).where(and(
      eq(ledgerEntries.accountId, account.id),
      eq(ledgerEntries.entryType, "trade_sell"),
    ));
    const positionRows = await database.select({
      assetId: assets.id,
      symbol: assets.symbol,
      name: assets.name,
      quantity: positions.quantity,
      averageEntryPrice: positions.averageEntryPrice,
      updatedAt: positions.updatedAt,
    }).from(positions)
      .innerJoin(assets, eq(assets.id, positions.assetId))
      .where(and(eq(positions.accountId, account.id), gt(positions.quantity, "0")))
      .orderBy(desc(positions.updatedAt));

    const valuedPositions = await Promise.all(positionRows.map(async position => {
      let quote: Awaited<ReturnType<typeof fetchMarketQuote>> | null = null;
      let quoteUnavailable = false;
      try {
        quote = await fetchMarketQuote(position.symbol);
      } catch {
        quoteUnavailable = true;
      }
      const quantity = Number(position.quantity);
      const averageEntryPrice = Number(position.averageEntryPrice);
      const currentPrice = quote?.price ?? null;
      const marketValue = currentPrice === null ? null : quantity * currentPrice;
      const costBasis = quantity * averageEntryPrice;
      const unrealizedPnl = currentPrice === null ? null : quantity * (currentPrice - averageEntryPrice);
      const quoteAgeSeconds = quote ? Math.max(0, Math.floor(Date.now() / 1000) - quote.quoteTime) : null;
      return {
        assetId: position.assetId,
        symbol: position.symbol,
        name: position.name,
        quantity,
        averageEntryPrice,
        currentPrice,
        marketValue,
        costBasis,
        unrealizedPnl,
        quoteTime: quote?.quoteTime ?? null,
        quoteAgeSeconds,
        quoteUnavailable,
      };
    }));

    const cash = Number(account.initialBalance) + Number(cashRow?.total ?? 0);
    const allQuotesAvailable = valuedPositions.every(position => position.marketValue !== null);
    const marketValue = allQuotesAvailable
      ? valuedPositions.reduce((total, position) => total + (position.marketValue ?? 0), 0)
      : null;
    const unrealizedPnl = allQuotesAvailable
      ? valuedPositions.reduce((total, position) => total + (position.unrealizedPnl ?? 0), 0)
      : null;
    if (allQuotesAvailable && marketValue !== null && unrealizedPnl !== null) {
      const [latestSnapshot] = await database.select({
        createdAt: portfolioSnapshots.createdAt,
      }).from(portfolioSnapshots)
        .where(eq(portfolioSnapshots.accountId, account.id))
        .orderBy(desc(portfolioSnapshots.createdAt))
        .limit(1);
      const snapshotIsDue = !latestSnapshot || Date.now() - latestSnapshot.createdAt.getTime() >= 15 * 60 * 1000;
      if (snapshotIsDue) {
        await database.insert(portfolioSnapshots).values({
          accountId: account.id,
          cash: cash.toString(),
          marketValue: marketValue.toString(),
          equity: (cash + marketValue).toString(),
          realizedPnl: Number(realizedRow?.total ?? 0).toString(),
          unrealizedPnl: unrealizedPnl.toString(),
        });
      }
    }

    const [dailyBaseline] = await database.select({
      equity: portfolioSnapshots.equity,
      createdAt: portfolioSnapshots.createdAt,
    }).from(portfolioSnapshots)
      .where(and(
        eq(portfolioSnapshots.accountId, account.id),
        lte(portfolioSnapshots.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
      ))
      .orderBy(desc(portfolioSnapshots.createdAt))
      .limit(1);
    const dailyPnl = dailyBaseline && marketValue !== null
      ? cash + marketValue - Number(dailyBaseline.equity)
      : null;
    const dailyChangePercent = dailyPnl !== null && dailyBaseline && Number(dailyBaseline.equity) > 0
      ? dailyPnl / Number(dailyBaseline.equity) * 100
      : null;

    const equityHistoryRows = await database.select({
      createdAt: portfolioSnapshots.createdAt,
      equity: portfolioSnapshots.equity,
      cash: portfolioSnapshots.cash,
      marketValue: portfolioSnapshots.marketValue,
    }).from(portfolioSnapshots)
      .where(eq(portfolioSnapshots.accountId, account.id))
      .orderBy(desc(portfolioSnapshots.createdAt))
      .limit(100);
    const equityHistory = equityHistoryRows.reverse().map(snapshot => ({
      timestamp: snapshot.createdAt.toISOString(),
      equity: Number(snapshot.equity),
      cash: Number(snapshot.cash),
      marketValue: Number(snapshot.marketValue),
    }));

    const recentOrders = await database.select({
      id: orders.id,
      symbol: assets.symbol,
      side: orders.side,
      orderType: orders.orderType,
      status: orders.status,
      quantity: orders.quantity,
      createdAt: orders.createdAt,
      fillPrice: fills.price,
    }).from(orders)
      .innerJoin(assets, eq(assets.id, orders.assetId))
      .leftJoin(fills, eq(fills.orderId, orders.id))
      .where(eq(orders.accountId, account.id))
      .orderBy(desc(orders.createdAt))
      .limit(10);

    return NextResponse.json({
      account: {
        id: account.id,
        name: account.name,
        initialBalance: Number(account.initialBalance),
        cash,
        marketValue,
        equity: marketValue === null ? null : cash + marketValue,
        realizedPnl: Number(realizedRow?.total ?? 0),
        unrealizedPnl,
        dailyPnl,
        dailyChangePercent,
        quoteCoverage: allQuotesAvailable ? "complete" : "partial",
        createdAt: account.createdAt,
      },
      positions: valuedPositions,
      equityHistory,
      recentOrders: recentOrders.map(order => ({
        ...order,
        quantity: Number(order.quantity),
        fillPrice: order.fillPrice === null ? null : Number(order.fillPrice),
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Failed to load demo account", cause);
    return NextResponse.json({ error: "Could not load demo account data. Verify that the development database migration has been applied." }, { status: 503 });
  }
}
