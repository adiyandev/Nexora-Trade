import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/db";
import { leaderboardProfiles } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const profileSchema = z.object({
  displayName: z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9_ ]+$/)
    .refine(value => value.trim().length >= 3, "Display name must have at least three characters."),
  isPublic: z.boolean(),
});

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    const { data, error } = await auth.getSession();
    if (error) return NextResponse.json({ error: "Could not verify the current session." }, { status: 503 });
    if (!data?.user?.id) return NextResponse.json({ error: "Sign in to manage your leaderboard profile." }, { status: 401 });
    userId = data.user.id;
  } catch {
    return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
  }
  if (!db) return NextResponse.json({ error: "Leaderboard storage is not configured." }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a display name (3–20 letters, numbers, spaces or underscores) and a visibility setting." }, { status: 400 });

  const displayName = parsed.data.displayName.replace(/\s+/g, " ");
  try {
    const [profile] = await db.insert(leaderboardProfiles).values({
      userId, displayName, isPublic: parsed.data.isPublic, updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: leaderboardProfiles.userId,
      set: { displayName, isPublic: parsed.data.isPublic, updatedAt: new Date() },
    }).returning({ displayName: leaderboardProfiles.displayName, isPublic: leaderboardProfiles.isPublic });
    return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message.toLowerCase() : "";
    if (message.includes("leaderboard_display_name_ci_uq") || message.includes("duplicate key")) {
      return NextResponse.json({ error: "That display name is already in use. Choose another." }, { status: 409 });
    }
    console.error("Failed to update leaderboard profile", cause);
    return NextResponse.json({ error: "Could not save your leaderboard profile." }, { status: 503 });
  }
}
