"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Lesson = {
  id: string;
  slug: string;
  title: string;
  level: string;
  minutes: number;
  summary: string;
  sections: Array<{ heading: string; body: string }>;
  quiz: { question: string; options: string[] };
  xp: number;
  completedAt: string | null;
};
type AcademyPayload = { lessons: Lesson[]; xp: number; level: number; error?: string };
type Feedback = { correct: boolean; explanation: string; awardedXp?: number; xp?: number; level?: number };

export function AcademyWorkspace() {
  const [data, setData] = useState<AcademyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/academy/lessons", { cache: "no-store" });
      const payload = await response.json() as AcademyPayload;
      if (!response.ok) throw new Error(payload.error || (response.status === 401 ? "Sign in to save your lesson progress." : "Academy lessons could not be loaded."));
      setData(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Academy lessons could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function submitAnswer(lesson: Lesson) {
    const answer = answers[lesson.slug];
    if (!Number.isInteger(answer) || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/academy/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: lesson.slug, answer }),
      });
      const result = await response.json() as Feedback & { error?: string };
      if (!response.ok) throw new Error(result.error || "Your answer could not be checked.");
      setFeedback(current => ({ ...current, [lesson.slug]: result }));
      if (result.correct) await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your answer could not be checked.");
    } finally {
      setSubmitting(false);
    }
  }

  const lessons = data?.lessons ?? [];
  const completedCount = lessons.filter(lesson => lesson.completedAt).length;
  const selected = lessons.find(lesson => lesson.slug === selectedSlug);

  return (
    <div className="academy-workspace">
      <section className="academy-progress-panel">
        <div>
          <span className="trade-eyebrow">YOUR LEARNING JOURNEY</span>
          <h2>Level {data?.level ?? 1} <span>·</span> {data?.xp ?? 0} XP</h2>
          <p>Learn at your pace. Correct quiz answers earn one-time experience points.</p>
        </div>
        <div className="academy-progress-metric">
          <strong>{completedCount}<span>/{lessons.length}</span></strong>
          <small>lessons completed</small>
          <div className="academy-progress-track"><span style={{ width: lessons.length ? `${completedCount / lessons.length * 100}%` : "0%" }} /></div>
        </div>
      </section>

      {error && <div className="trade-alert error" role="alert">{error}{error.toLowerCase().includes("sign in") && <div className="trade-auth-links"><Link href="/auth/sign-in">Sign in</Link><Link href="/auth/sign-up">Create an account</Link></div>}</div>}
      {loading && <div className="academy-empty" role="status">Loading your lessons and saved progress…</div>}
      {!loading && !data && !error && <div className="academy-empty">Academy is unavailable right now.</div>}

      {!loading && data && <div className="academy-lesson-grid">
        <div className="academy-lesson-list">
          {lessons.map((lesson, index) => (
            <button type="button" key={lesson.id} className={selectedSlug === lesson.slug ? "academy-lesson-card selected" : "academy-lesson-card"} onClick={() => setSelectedSlug(lesson.slug)} aria-pressed={selectedSlug === lesson.slug}>
              <span className={lesson.completedAt ? "academy-lesson-number complete" : "academy-lesson-number"}>{lesson.completedAt ? "✓" : String(index + 1).padStart(2, "0")}</span>
              <span className="academy-lesson-copy"><b>{lesson.title}</b><small>{lesson.minutes} min · {lesson.level}</small><span>{lesson.summary}</span></span>
              <span className="academy-lesson-xp">+{lesson.xp} XP</span>
            </button>
          ))}
          {lessons.length === 0 && <div className="academy-empty">No lessons are available yet. Apply the academy development migration.</div>}
        </div>

        {selected && <article className="academy-lesson-detail">
          <div className="academy-detail-heading"><span className="trade-eyebrow">LESSON · {selected.minutes} MIN</span><span className={selected.completedAt ? "academy-completed-pill" : "academy-xp-pill"}>{selected.completedAt ? "Completed" : `Earn ${selected.xp} XP`}</span></div>
          <h2>{selected.title}</h2>
          <p className="academy-detail-summary">{selected.summary}</p>
          {selected.sections.map(section => <section className="academy-content-section" key={section.heading}><h3>{section.heading}</h3><p>{section.body}</p></section>)}
          <div className="academy-quiz">
            <span className="trade-eyebrow">QUICK KNOWLEDGE CHECK</span>
            <h3>{selected.quiz.question}</h3>
            <div className="academy-quiz-options">
              {selected.quiz.options.map((option, index) => <label key={option} className={answers[selected.slug] === index ? "academy-quiz-option selected" : "academy-quiz-option"}>
                <input type="radio" name={`quiz-${selected.slug}`} checked={answers[selected.slug] === index} onChange={() => { setAnswers(current => ({ ...current, [selected.slug]: index })); setFeedback(current => { const next = { ...current }; delete next[selected.slug]; return next; }); }} />
                <span>{option}</span>
              </label>)}
            </div>
            {feedback[selected.slug] && <div className={feedback[selected.slug].correct ? "academy-feedback correct" : "academy-feedback incorrect"} role="status">
              <b>{feedback[selected.slug].correct ? "Correct!" : "Not quite yet"}</b>
              <p>{feedback[selected.slug].explanation}</p>
              {feedback[selected.slug].correct && <small>{feedback[selected.slug].awardedXp ? `+${feedback[selected.slug].awardedXp} XP earned` : "You already earned XP for this lesson."}</small>}
            </div>}
            <button type="button" className="btn overview-primary-action academy-submit" disabled={submitting || !Number.isInteger(answers[selected.slug]) || Boolean(selected.completedAt)} onClick={() => void submitAnswer(selected)}>
              {selected.completedAt ? "Lesson completed" : submitting ? "Checking answer…" : "Check answer & complete"}
            </button>
          </div>
        </article>}
      </div>}
    </div>
  );
}
