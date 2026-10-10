import type { Model } from "./types";

/** The investor's own targets (ADR-0010). Minimum return is stored elsewhere. */
export type Criteria = {
  minDscr?: number;
  maxEquity?: number;
  minCoc?: number;
};
export type TargetKey = "irr" | "dscr" | "equity" | "coc";
export type TargetState = "meets" | "misses" | "unknown";
export type Actuals = Record<TargetKey, number | null>;
export type Target = {
  key: TargetKey;
  label: string;
  target: number | undefined;
  actual: number | null;
  state: TargetState;
};
export const targetLabels: Record<TargetKey, string> = {
  irr: "Minimum annual IRR",
  dscr: "Minimum Year 1 DSCR",
  equity: "Maximum initial equity",
  coc: "Minimum Year 1 cash-on-cash",
};
const keys = ["minDscr", "maxEquity", "minCoc"] as const;

// Criteria are read back from storage, so keep only usable numbers.
export function criteriaOf(raw: unknown): Criteria {
  const c: Criteria = {};
  if (raw && typeof raw === "object")
    for (const k of keys) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) c[k] = v;
    }
  return c;
}

/** A blank input (NaN) removes the target instead of storing an invalid number. */
export const withCriterion = (
  c: Criteria,
  key: keyof Criteria,
  value: number,
): Criteria => criteriaOf({ ...c, [key]: value });

/** Equity is a maximum; the other targets are minimums. */
export const passes = (key: TargetKey, actual: number, target: number) =>
  key === "equity" ? actual <= target : actual >= target;
const coc = (m: Model, y: Model["years"][number]) =>
  y.operatingCash !== null && m.initialEquity > 0
    ? y.operatingCash / m.initialEquity
    : null;

/** `actual` is null when the model has errors: nothing is then shown as a pass. */
export function judge(
  minIrr: number | undefined,
  c: Criteria,
  actual: Actuals | null,
): Target[] {
  const row = (key: TargetKey, target: number | undefined): Target => {
    const a = actual?.[key] ?? null;
    return {
      key,
      label: targetLabels[key],
      target,
      actual: a,
      state:
        target === undefined || a === null
          ? "unknown"
          : passes(key, a, target)
            ? "meets"
            : "misses",
    };
  };
  return [
    row("irr", minIrr),
    row("dscr", c.minDscr),
    row("equity", c.maxEquity),
    row("coc", c.minCoc),
  ];
}

export function quickActuals(m: Model): Actuals | null {
  const y = m.years[0];
  if (m.errors.length || !y) return null;
  return {
    irr: m.irr,
    dscr: y.dscr,
    equity: m.initialEquity,
    coc: coc(m, y),
  };
}

/** Year-by-year cash-on-cash through the hold; sale proceeds stay separate. */
export function yearlyCoc(m: Model, hold: number) {
  return m.years.slice(0, hold).map((y) => ({
    year: y.year,
    operatingCash: y.operatingCash,
    coc: coc(m, y),
    sale: y.year === hold ? m.netSale : null,
  }));
}
