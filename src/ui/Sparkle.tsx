import { useEffect, type CSSProperties } from "react";

// Eight four-point stars burst outward once, in the pastel accents (ADR-0006).
const STARS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 + 0.3;
  const reach = i % 2 ? 54 : 74;
  return {
    "--dx": `${Math.cos(angle) * reach}px`,
    "--dy": `${Math.sin(angle) * reach}px`,
    "--i": i,
  } as CSSProperties;
});

/** One-shot success burst. Renders nothing under reduced motion. */
export default function Sparkle({ onDone }: { onDone: () => void }) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    const timer = setTimeout(onDone, reduce ? 0 : 2000);
    return () => clearTimeout(timer);
  }, [onDone, reduce]);
  if (reduce) return null;
  return (
    <span className="sparkle" aria-hidden="true">
      {STARS.map((style, i) => (
        <span key={i} style={style} />
      ))}
    </span>
  );
}
