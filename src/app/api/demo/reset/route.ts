import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resetInput = z.object({ confirm: z.literal(true) });

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    const { data, error } = await auth.getSession();
    if (error) return NextResponse.json({ error: "Could not verify the current session." }, { status: 503 });
    if (!data?.user?.id) return NextResponse.json({ error: "Sign in to reset your demo account." }, { status: 401 });
    userId = data.user.id;
  } catch {
    return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
  }

  if (!db) return NextResponse.json({ error: "Demo account storage is not configured." }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = resetInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Explicit confirmation is required to reset the demo account." }, { status: 400 });
  }

  try {
    const result = await db.execute(sql`SELECT reset_demo_account(${userId}, ${parsed.data.confirm}) AS result`);
    let raw: unknown = result.rows[0]?.result;
    if (typeof raw === "string") {
      try { raw = JSON.parse(raw) as unknown; } catch { raw = null; }
    }
    const outcome = z.object({
      ok: z.boolean(),
      code: z.string().optional(),
      message: z.string().optional(),
      accountId: z.string().optional(),
      initialBalance: z.union([z.string(), z.number()]).optional(),
    }).safeParse(raw);
    if (!outcome.success) {
      console.error("Demo reset function returned an invalid response", outcome.error);
      return NextResponse.json({ error: "The demo account reset returned an invalid response." }, { status: 500 });
    }
    if (!outcome.data.ok) {
      const status = outcome.data.code === "UNAUTHORIZED" ? 401 : outcome.data.code === "CONFIRMATION_REQUIRED" ? 400 : 503;
      return NextResponse.json({ error: outcome.data.message ?? "Demo account reset failed." }, { status });
    }
    return NextResponse.json({
      accountId: outcome.data.accountId,
      initialBalance: Number(outcome.data.initialBalance ?? 100000),
      message: outcome.data.message ?? "Demo account reset.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Demo account reset failed", cause);
    return NextResponse.json({ error: "Could not reset the demo account. Verify the development database migration." }, { status: 503 });
  }
}
