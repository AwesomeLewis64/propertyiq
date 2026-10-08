import type { DatedFlow } from "./types";
export function dateAt(start: string, month: number, end = false): string {
  const [y, m] = start.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + month + (end ? 1 : 0), end ? 0 : 1))
    .toISOString()
    .slice(0, 10);
}
export function xnpv(flows: DatedFlow[], rate: number): number | null {
  if (rate <= -1 || !flows.length) return null;
  const origin = Date.parse(flows[0].date);
  const result = flows.reduce(
    (s, f) =>
      s +
      f.amount /
        Math.pow(1 + rate, (Date.parse(f.date) - origin) / 86400000 / 365),
    0,
  );
  return Number.isFinite(result) ? result : null;
}
export function xirr(flows: DatedFlow[]): {
  value: number | null;
  reason: string | null;
} {
  const merged = new Map<string, number>();
  for (const f of flows)
    merged.set(f.date, (merged.get(f.date) ?? 0) + f.amount);
  const f = [...merged]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({ date, amount }))
    .filter((f) => Math.abs(f.amount) > 1e-8);
  if (
    f.length < 2 ||
    f.some(
      (v) => !Number.isFinite(v.amount) || !Number.isFinite(Date.parse(v.date)),
    )
  )
    return { value: null, reason: "Incomplete dated cash flows." };
  const changes = f
    .slice(1)
    .filter((v, i) => Math.sign(v.amount) !== Math.sign(f[i].amount)).length;
  if (changes !== 1)
    return {
      value: null,
      reason:
        changes > 1
          ? "Multiple sign changes: a unique XIRR is not assumed."
          : "Both contributions and distributions are needed.",
    };
  const scale = Math.max(...f.map((v) => Math.abs(v.amount))),
    origin = Date.parse(f[0].date);
  const npv = (x: number) =>
    f.reduce(
      (s, v) =>
        s +
        (v.amount / scale) *
          Math.exp((-x * (Date.parse(v.date) - origin)) / 86400000 / 365),
      0,
    );
  let lo = -15,
    hi = 15,
    fl = npv(lo);
  if (!Number.isFinite(fl) || fl * npv(hi) > 0)
    return { value: null, reason: "No supported XIRR root." };
  for (let i = 0; i < 180; i++) {
    const mid = (lo + hi) / 2,
      fm = npv(mid);
    if (Math.abs(fm) < 1e-11) return { value: Math.expm1(mid), reason: null };
    if (fl * fm <= 0) hi = mid;
    else {
      lo = mid;
      fl = fm;
    }
  }
  return { value: null, reason: "XIRR did not converge." };
}
export function equityMultiple(flows: DatedFlow[]): number | null {
  const negative = -flows
      .filter((f) => f.amount < 0)
      .reduce((s, f) => s + f.amount, 0),
    positive = flows
      .filter((f) => f.amount > 0)
      .reduce((s, f) => s + f.amount, 0);
  return negative > 0 ? positive / negative : null;
}
