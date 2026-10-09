import { useCountUp } from "./useCountUp";

/**
 * A number that counts up visually while the DOM text (what screen readers,
 * copy/paste and tests see) is always the final formatted value. The moving
 * figure is painted by ::after with empty alt text.
 */
export default function CountUp({
  value,
  format,
}: {
  value: number | null;
  format: (v: number | null) => string;
}) {
  const frame = useCountUp(value);
  return (
    <span
      className={frame === null ? undefined : "count-up"}
      data-count={frame === null ? undefined : format(frame)}
    >
      {format(value)}
    </span>
  );
}
