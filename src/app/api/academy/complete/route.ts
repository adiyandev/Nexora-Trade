import { getProgressionLevel, gradeQuizAnswer } from "@/lib/progression";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/db";
import { lessons, learningProgress, xpLedger } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const answerSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  answer: z.number().int().min(0).max(20),
});

type LessonContent = { quiz: { options: string[]; answer: number; explanation: string }; xp: number };
function parseContent(raw: string): LessonContent | null {
  try {
    const value = JSON.parse(raw) as Partial<LessonContent>;
    if (!value.quiz || !Array.isArray(value.quiz.options) || !Number.isInteger(value.quiz.answer)
      || typeof value.quiz.explanation !== "string" || !Number.isInteger(value.xp)) return null;
    return value as LessonContent;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
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

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = answerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide a lesson and a valid quiz answer." }, { status: 400 });

  try {
    const [lesson] = await db.select({ id: lessons.id, slug: lessons.slug, content: lessons.content })
      .from(lessons).where(eq(lessons.slug, parsed.data.slug)).limit(1);
    if (!lesson) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    const content = parseContent(lesson.content);
    if (!content || parsed.data.answer >= content.quiz.options.length) {
      return NextResponse.json({ error: "This lesson's quiz is not configured correctly." }, { status: 500 });
    }
    const grade = gradeQuizAnswer(parsed.data.answer, content.quiz.answer, content.quiz.options.length);
    if (grade === null) return NextResponse.json({ error: "Provide a valid answer choice." }, { status: 400 });
    if (!grade) {
      return NextResponse.json({ correct: false, explanation: content.quiz.explanation }, { status: 200 });
    }

    await db.insert(learningProgress).values({
      userId, lessonId: lesson.id, completedAt: new Date(),
    }).onConflictDoUpdate({
      target: [learningProgress.userId, learningProgress.lessonId],
      set: { completedAt: sql`coalesce(${learningProgress.completedAt}, excluded.completed_at)` },
    });
    const idempotencyKey = `lesson-complete:${lesson.id}`;
    const reward = await db.insert(xpLedger).values({
      userId, source: "lesson_completion", sourceId: lesson.id,
      amount: content.xp, idempotencyKey,
      metadata: { slug: lesson.slug, title: lesson.slug },
    }).onConflictDoNothing({ target: [xpLedger.userId, xpLedger.idempotencyKey] }).returning({ id: xpLedger.id });
    const [xpRow] = await db.select({ total: sql<number>`coalesce(sum(${xpLedger.amount}), 0)::int` })
      .from(xpLedger).where(eq(xpLedger.userId, userId));
    const xp = Number(xpRow?.total ?? 0);
    return NextResponse.json({
      correct: true, completed: true, awardedXp: reward.length ? content.xp : 0,
      xp, level: getProgressionLevel(xp), explanation: content.quiz.explanation,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Failed to save academy progress", cause);
    return NextResponse.json({ error: "Could not save academy progress." }, { status: 503 });
  }
}
