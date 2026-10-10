import { useEffect, useRef, useState } from "react";
import { money } from "./format";
export function parseMoney(raw: string): number {
  const clean = raw.replace(/[$,\s]/g, "");
  return /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(clean) ? Number(clean) : NaN;
}
export default function MoneyInput({
  value,
  onChange,
  id,
  min,
  max,
  optional,
}: {
  value: number;
  onChange: (n: number) => void;
  id?: string;
  min?: number;
  max?: number;
  /** A blank is a valid answer, not an error. */
  optional?: boolean;
}) {
  const [draft, setDraft] = useState(
    Number.isFinite(value) ? money(value, 2) : "",
  );
  const emitted = useRef<number | null>(null);
  useEffect(() => {
    if (emitted.current !== null && Object.is(emitted.current, value)) return;
    setDraft(Number.isFinite(value) ? money(value, 2) : "");
  }, [value]);
  return (
    <input
      id={id}
      inputMode="decimal"
      value={draft}
      aria-invalid={
        (!optional && !Number.isFinite(value)) ||
        (min !== undefined && value < min) ||
        (max !== undefined && value > max)
      }
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => {
        if (Number.isFinite(value)) setDraft(money(value, 2));
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = parseMoney(e.target.value);
        emitted.current = n;
        onChange(n);
      }}
    />
  );
}
