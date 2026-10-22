export function getProgressionLevel(xp: number): number {
  if (!Number.isFinite(xp) || xp < 0) return 1;
  return Math.floor(xp / 100) + 1;
}

export function gradeQuizAnswer(answer: number, correctAnswer: number, optionCount: number): boolean | null {
  if (!Number.isInteger(answer) || !Number.isInteger(correctAnswer)
    || !Number.isInteger(optionCount) || optionCount < 2
    || answer < 0 || answer >= optionCount
    || correctAnswer < 0 || correctAnswer >= optionCount) return null;
  return answer === correctAnswer;
}

export function getUtcDayKey(value: Date | number = Date.now()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid date for daily progression.");
  return date.toISOString().slice(0, 10);
}
