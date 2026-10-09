/**
 * Next zoom window [start, end] over n points, resized by factor around
 * center (kept at the same relative position), or null for "show all".
 */
export function zoomWindow(
  from: number,
  to: number,
  n: number,
  factor: number,
  center: number,
  minSpan = 4,
): [number, number] | null {
  const span = to - from + 1;
  const next = Math.max(minSpan, Math.min(n, Math.round(span * factor)));
  if (next >= n) return null;
  const start = Math.round(center - ((center - from) * next) / span);
  const clamped = Math.min(Math.max(0, start), n - next);
  return [clamped, clamped + next - 1];
}
