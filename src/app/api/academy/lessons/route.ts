import { getProgressionLevel, getUtcDayKey } from "@/lib/progression";
import { and, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { db } from "@/db";
import { lessons, learningProgress, xpLedger } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LessonContent = {
  minutes: number;
  summary: string;
  sections: Array<{ heading: string; body: string }>;
  quiz: { question: string; options: string[]; answer: number; explanation: string };
  xp: number;
};

function parseLessonContent(raw: string): LessonContent | null {
  try {
    const value = JSON.parse(raw) as Partial<LessonContent>;
    if (!Number.isInteger(value.minutes) || !value.summary || !Array.isArray(value.sections)
      || !value.quiz || !Array.isArray(value.quiz.options) || !Number.isInteger(value.quiz.answer)
      || !Number.isInteger(value.xp)) return null;
    return value as LessonContent;
  } catch {
    return null;
  }
}

export async function GET() {
  let userId: string;
  try {
    const { data, error } = await auth.getSession();
    if (error) return NextResponse.json({ error: "Could not verify the current session." }, { status: 503 });
    if (!data?.user?.id) return NextResponse.json({ error: "Sign in to save academy progress." }, { status: 401 });
    userId = data.user.id;
  } catch {
    return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
  }
  if (!db) return NextResponse.json({ error: "Academy storage is not configured." }, { status: 503 });

  try {
    const dayKey = getUtcDayKey();
    const dayStart = new Date(`${dayKey}T00:00:00.000Z`);
    const [lessonRows, progressRows, xpRows, dailyProgressRows, dailyRewardRows] = await Promise.all([
      db.select({ id: lessons.id, slug: lessons.slug, title: lessons.title, level: lessons.level, content: lessons.content })
        .from(lessons).orderBy(lessons.slug),
      db.select({ lessonId: learningProgress.lessonId, completedAt: learningProgress.completedAt })
        .from(learningProgress).where(eq(learningProgress.userId, userId)),
      db.select({ total: sql<number>`coalesce(sum(${xpLedger.amount}), 0)::int` })
        .from(xpLedger).where(eq(xpLedger.userId, userId)),
      db.select({ id: learningProgress.id }).from(learningProgress)
        .where(and(eq(learningProgress.userId, userId), gte(learningProgress.completedAt, dayStart))).limit(1),
      db.select({ id: xpLedger.id }).from(xpLedger)
        .where(and(eq(xpLedger.userId, userId), eq(xpLedger.idempotencyKey, `daily-learning:${dayKey}`))).limit(1),
    ]);
    const progress = new Map(progressRows.map(row => [row.lessonId, row.completedAt]));
    const parsedLessons = lessonRows.map(row => {
      const content = parseLessonContent(row.content);
      if (!content) return null;
      return {
        id: row.id, slug: row.slug, title: row.title, level: row.level,
        minutes: content.minutes, summary: content.summary, sections: content.sections,
        quiz: { question: content.quiz.question, options: content.quiz.options },
        xp: content.xp, completedAt: progress.get(row.id)?.toISOString() ?? null,
      };
    }).filter((lesson): lesson is NonNullable<typeof lesson> => lesson !== null);
    const xp = Number(xpRows[0]?.total ?? 0);
    return NextResponse.json({ lessons: parsedLessons, xp, level: getProgressionLevel(xp), dailyMission: { rewardXp: 10, eligible: dailyProgressRows.length > 0, claimed: dailyRewardRows.length > 0, dayKey } },
      { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Failed to load academy", cause);
    return NextResponse.json({ error: "Could not load academy lessons. Verify the development migration." }, { status: 503 });
  }
}
