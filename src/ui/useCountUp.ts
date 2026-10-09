import { useEffect, useRef, useState } from "react";

const easeOut = (t: number) => 1 - (1 - t) ** 4;
/** Value at progress t (0–1) between from and to, eased. */
export const countFrame = (from: number, to: number, t: number) =>
  from + (to - from) * easeOut(Math.min(1, Math.max(0, t)));

/**
 * Counts a number up from 0 the first time it appears, then tweens from the
 * old value on later changes. Returns the in-between number while counting,
 * or null when the caller should show the final value as is.
 */
export function useCountUp(target: number | null) {
  // Start at 0 on the very first paint so the final value never flashes first.
  const [frame, setFrame] = useState<number | null>(() =>
    target !== null &&
    Number.isFinite(target) &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : null,
  );
  const last = useRef<number | null>(null);
  const first = useRef(true);
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (target === null || !Number.isFinite(target) || reduce) {
      last.current = target;
      setFrame(null);
      return;
    }
    const from = last.current ?? 0;
    const duration = first.current ? 900 : 300;
    if (from === target) {
      setFrame(null);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    let current = from;
    const tick = (now: number) => {
      const t = (now - t0) / duration;
      current = countFrame(from, target, t);
      if (t >= 1) {
        last.current = target;
        first.current = false;
        setFrame(null);
        return;
      }
      setFrame(current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      // An interrupted count resumes from where it visibly was.
      cancelAnimationFrame(raf);
      last.current = current;
    };
  }, [target]);
  return frame;
}
