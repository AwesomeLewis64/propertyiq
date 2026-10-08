import type { DebtMonth, DebtYear } from "./types";
export function payment(
  principal: number,
  annualRate: number,
  months: number,
): number {
  if (principal === 0) return 0;
  if (months <= 0) throw new Error("Amortization must be positive.");
  const r = annualRate / 12;
  return r === 0
    ? principal / months
    : (principal * r) / -Math.expm1(-months * Math.log1p(r));
}
// Interest-only months consume the original amortization term; the remaining balance
// recasts over the remaining months. Maturity stops this schedule without refinancing.
export function debtSchedule(
  principal: number,
  annualRate: number,
  amortizationYears: number,
  maturityYears: number,
  ioMonths: number,
  horizonYears: number,
) {
  const term = amortizationYears * 12;
  const pmt = payment(principal, annualRate, term - ioMonths);
  const months: DebtMonth[] = [];
  let balance = principal;
  for (
    let month = 1;
    month <= Math.min(horizonYears * 12, maturityYears * 12, term);
    month++
  ) {
    const opening = balance;
    const interest = (opening * annualRate) / 12;
    const principalPaid =
      month <= ioMonths ? 0 : Math.min(opening, Math.max(0, pmt - interest));
    balance = Math.max(0, opening - principalPaid);
    if (balance < 1e-7) balance = 0;
    months.push({
      month,
      opening,
      payment: interest + principalPaid,
      interest,
      principal: principalPaid,
      balance,
    });
  }
  const years: DebtYear[] = [];
  for (let year = 1; year <= horizonYears; year++) {
    const rows = months.filter((m) => Math.ceil(m.month / 12) === year);
    // Fully amortized loans remain debt-free, even beyond their contractual maturity.
    if (!rows.length && balance > 0) break;
    years.push({
      year,
      opening: rows[0]?.opening ?? 0,
      service: rows.reduce((s, m) => s + m.payment, 0),
      interest: rows.reduce((s, m) => s + m.interest, 0),
      principal: rows.reduce((s, m) => s + m.principal, 0),
      balance: rows.at(-1)?.balance ?? 0,
      balloon: year === maturityYears ? (rows.at(-1)?.balance ?? 0) : 0,
    });
  }
  return {
    months,
    years,
    monthlyPayment: ioMonths > 0 ? (principal * annualRate) / 12 : pmt,
  };
}
