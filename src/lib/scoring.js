export const QUESTION_TIME = 15;
export const BASE_POINTS = 100;
export const TIME_BONUS_MAX = 50;

export function calculatePoints(isCorrect, timeRemainingSeconds) {
  if (!isCorrect) return 0;
  const timeBonus = Math.floor((timeRemainingSeconds / QUESTION_TIME) * TIME_BONUS_MAX);
  return BASE_POINTS + timeBonus;
}
