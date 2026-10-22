import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/db";
import { leaderboardProfiles } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let userId: string;
  try {
    const { data, error } = await auth.getSession();
    if (error) return NextResponse.json({ error: "Could not verify the current session." }, { status: 503 });
    if (!data?.user?.id) return NextResponse.json({ error: "Sign in to view demo seasons." }, { status: 401 });
    userId = data.user.id;
  } catch {
    return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
  }
  if (!db) return NextResponse.json({ error: "Leaderboard storage is not configured." }, { status: 503 });

  try {
    const [profileRows, ranking] = await Promise.all([
      db.select({ displayName: leaderboardProfiles.displayName, isPublic: leaderboardProfiles.isPublic })
        .from(leaderboardProfiles).where(eq(leaderboardProfiles.userId, userId)).limit(1),
      db.execute(sql`
        WITH season AS (
          SELECT date_trunc('month', now()) AS starts_at
        ),
        snapshots AS (
          SELECT snapshot.account_id, snapshot.equity, snapshot.created_at,
            first_value(snapshot.equity) OVER (PARTITION BY snapshot.account_id ORDER BY snapshot.created_at ASC) AS first_equity,
            first_value(snapshot.equity) OVER (PARTITION BY snapshot.account_id ORDER BY snapshot.created_at DESC) AS latest_equity,
            max(snapshot.equity) OVER (PARTITION BY snapshot.account_id ORDER BY snapshot.created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS peak_equity
          FROM portfolio_snapshots snapshot CROSS JOIN season
          WHERE snapshot.created_at >= season.starts_at
        ),
        summary AS (
          SELECT account_id, min(first_equity)::numeric AS start_equity,
            max(latest_equity)::numeric AS latest_equity,
            max(CASE WHEN peak_equity > 0 THEN (peak_equity - equity) / peak_equity * 100 ELSE 0 END)::numeric AS max_drawdown,
            max(created_at) AS latest_at
          FROM snapshots GROUP BY account_id
        )
        SELECT profile.display_name,
          round((summary.latest_equity / nullif(summary.start_equity, 0) - 1) * 100, 2)::float8 AS return_percent,
          round(summary.max_drawdown, 2)::float8 AS max_drawdown_percent,
          summary.latest_at,
          to_char(date_trunc('month', now()), 'Mon YYYY') AS season
        FROM summary
        JOIN demo_accounts account ON account.id = summary.account_id
        JOIN leaderboard_profiles profile ON profile.user_id = account.user_id
        WHERE profile.is_public = true AND summary.start_equity > 0
        ORDER BY return_percent DESC, max_drawdown_percent ASC, profile.display_name ASC
        LIMIT 25
      `),
    ]);
    const rows = (ranking.rows ?? []) as Array<{
      display_name: string; return_percent: number | string;
      max_drawdown_percent: number | string; latest_at: Date | string; season: string;
    }>;
    const season = rows[0]?.season ?? new Date().toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
    return NextResponse.json({
      profile: profileRows[0] ?? null,
      season,
      rankings: rows.map(row => ({
        displayName: row.display_name,
        returnPercent: Number(row.return_percent),
        maxDrawdownPercent: Number(row.max_drawdown_percent),
        updatedAt: row.latest_at instanceof Date ? row.latest_at.toISOString() : row.latest_at,
      })),
      methodology: "Current-month recorded portfolio snapshots only. Returns compare each participant's first and latest snapshot this season. Public ranking is opt-in.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Failed to load demo leaderboard", cause);
    return NextResponse.json({ error: "Could not load the demo leaderboard. Verify the development migration." }, { status: 503 });
  }
}
