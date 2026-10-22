import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/db";
import { getProgressionLevel, getUtcDayKey } from "@/lib/progression";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  let userId: string;
  try {
    const { data, error } = await auth.getSession();
    if (error) return NextResponse.json({ error: "Could not verify the current session." }, { status: 503 });
    if (!data?.user?.id) return NextResponse.json({ error: "Sign in to claim learning missions." }, { status: 401 });
    userId = data.user.id;
  } catch {
    return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
  }
  if (!db) return NextResponse.json({ error: "Academy storage is not configured." }, { status: 503 });

  const dayKey = getUtcDayKey();
  const dayStart = new Date(`${dayKey}T00:00:00.000Z`);
  const idempotencyKey = `daily-learning:${dayKey}`;
  try {
    const result = await db.execute(sql`
      WITH eligible AS (
        SELECT 1 FROM learning_progress
        WHERE user_id = ${userId} AND completed_at >= ${dayStart}
        LIMIT 1
      ),
      reward AS (
        INSERT INTO xp_ledger (user_id, source, source_id, amount, idempotency_key, metadata)
        SELECT ${userId}, 'daily_mission', ${dayKey}, 10, ${idempotencyKey},
          ${JSON.stringify({ mission: "Complete at least one lesson in a UTC day", dayKey })}::jsonb
        WHERE EXISTS (SELECT 1 FROM eligible)
        ON CONFLICT (user_id, idempotency_key) DO NOTHING
        RETURNING amount
      )
      SELECT
        EXISTS (SELECT 1 FROM eligible) AS eligible,
        EXISTS (SELECT 1 FROM xp_ledger WHERE user_id = ${userId} AND idempotency_key = ${idempotencyKey}) AS claimed,
        coalesce((SELECT sum(amount) FROM reward), 0)::int AS awarded_xp,
        coalesce((SELECT sum(amount) FROM xp_ledger WHERE user_id = ${userId}), 0)::int AS xp_total
    `);
    const row = result.rows[0] as { eligible: boolean; claimed: boolean; awarded_xp: number | string; xp_total: number | string } | undefined;
    if (!row?.eligible) {
      return NextResponse.json({ error: "Complete a lesson today before claiming this mission.", eligible: false }, { status: 409 });
    }
    const xp = Number(row.xp_total ?? 0);
    return NextResponse.json({
      eligible: true, claimed: Boolean(row.claimed), awardedXp: Number(row.awarded_xp ?? 0),
      rewardXp: 10, xp, level: getProgressionLevel(xp), dayKey,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Failed to claim daily learning mission", cause);
    return NextResponse.json({ error: "Could not claim the daily learning mission." }, { status: 503 });
  }
}
