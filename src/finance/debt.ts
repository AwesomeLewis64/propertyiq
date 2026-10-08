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
export type DebtOptions = {
  ioConvention?: "after-io" | "consumes-term";
  accrual?: "30/360" | "actual/360";
  startDate?: string;
};
// Calendar-month accrual. Scheduled principal uses the nominal 30/360 payment;
// actual/360 changes cash interest and total payment, never the principal schedule.
export function monthDays(startDate: string, month: number): number {
  const [year, initialMonth] = startDate.split("-").map(Number);
  return new Date(Date.UTC(year, initialMonth - 1 + month, 0)).getUTCDate();
}
export function accruedInterest(
  balance: number,
  annualRate: number,
  month: number,
  options: DebtOptions = {},
) {
  return (
    balance *
    annualRate *
    (options.accrual === "actual/360"
      ? monthDays(options.startDate ?? "2026-10-01", month) / 360
      : 1 / 12)
  );
}
export function debtSchedule(
  principal: number,
  annualRate: number,
  amortizationYears: number,
  maturityYears: number,
  ioMonths: number,
  horizonYears: number,
  options: DebtOptions = {},
) {
  const term = amortizationYears * 12;
  const consumes = options.ioConvention === "consumes-term";
  const pmt = payment(principal, annualRate, term - (consumes ? ioMonths : 0));
  const months: DebtMonth[] = [];
  let balance = principal;
  for (
    let month = 1;
    month <=
    Math.min(
      horizonYears * 12,
      maturityYears * 12,
      term + (consumes ? 0 : ioMonths),
    );
    month++
  ) {
    const opening = balance;
    const interest = accruedInterest(opening, annualRate, month, options);
    const principalPaid =
      month <= ioMonths
        ? 0
        : Math.min(opening, Math.max(0, pmt - (opening * annualRate) / 12));
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
    monthlyPayment: months[0]?.payment ?? 0,
    postIoPayment: pmt,
  };
}
