import { useEffect, useState, type ReactNode } from "react";

/** True while the viewport is at most `max` px wide; follows resizes and rotation. */
export function useNarrow(max: number) {
  const query = `(max-width: ${max}px)`;
  const [narrow, setNarrow] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const sync = () => setNarrow(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, [query]);
  return narrow;
}

/**
 * Wide screens: children render as-is. Narrow screens: they sit behind a
 * one-line summary so results are not pushed down the page. `closeOnPick`
 * closes it when a navigation button inside is chosen.
 */
export default function MobileDisclosure({
  max,
  title,
  className,
  closeOnPick = false,
  children,
}: {
  max: number;
  title: ReactNode;
  className?: string;
  closeOnPick?: boolean;
  children: ReactNode;
}) {
  const narrow = useNarrow(max);
  const [open, setOpen] = useState(false);
  if (!narrow) return <>{children}</>;
  return (
    <details
      className={`iq-disclosure${className ? ` ${className}` : ""}`}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      onClick={
        closeOnPick
          ? (e) => {
              if ((e.target as HTMLElement).closest("nav button"))
                setOpen(false);
            }
          : undefined
      }
    >
      <summary>{title}</summary>
      {children}
    </details>
  );
}
