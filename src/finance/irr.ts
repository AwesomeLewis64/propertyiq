export function irr(cashFlows: number[]): {
  value: number | null;
  reason: string | null;
} {
  if (cashFlows.length < 2 || cashFlows.some((v) => !Number.isFinite(v)))
    return { value: null, reason: "Incomplete cash flows." };
  const nonzero = cashFlows.filter((v) => v !== 0);
  const changes = nonzero
    .slice(1)
    .filter((v, i) => Math.sign(v) !== Math.sign(nonzero[i])).length;
  if (!changes)
    return {
      value: null,
      reason: "IRR requires both positive and negative cash flows.",
    };
  if (changes > 1)
    return {
      value: null,
      reason:
        "Multiple cash-flow sign changes can produce ambiguous IRRs; IRR is suppressed.",
    };
  const scale = Math.max(...cashFlows.map(Math.abs));
  // Solve in log(1+r): wide range, stable discounting and no Newton guess dependency.
  const npv = (x: number) =>
    cashFlows.reduce((sum, v, t) => sum + (v / scale) * Math.exp(-t * x), 0);
  let lo = -20,
    hi = 20;
  let flo = npv(lo),
    fhi = npv(hi);
  if (!Number.isFinite(flo) || flo * fhi > 0)
    return {
      value: null,
      reason: "No IRR found inside the supported numerical range.",
    };
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2,
      f = npv(mid);
    if (Math.abs(f) < 1e-12 || hi - lo < 1e-13)
      return { value: Math.expm1(mid), reason: null };
    if (flo * f <= 0) {
      hi = mid;
      fhi = f;
    } else {
      lo = mid;
      flo = f;
    }
  }
  return { value: null, reason: "IRR solver did not converge." };
}
