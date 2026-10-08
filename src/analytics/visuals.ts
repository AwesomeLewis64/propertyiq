import type { Assumptions, Model, Projection } from "../finance/types";
import type { Project, Forecast, Monthly } from "../advanced/types";
import { calculate } from "../finance/model";
import { forecast } from "../advanced/engine";

export type BridgeRow = {
  label: string;
  value: number | null;
  start: number;
  end: number | null;
  total: boolean;
};
function bridge(parts: [string, number | null, boolean?][]): BridgeRow[] {
  let running = 0;
  return parts.map(([label, value, total = false]) => {
    const start = total ? 0 : running;
    const end = value === null ? null : total ? value : running + value;
    if (end !== null) running = end;
    return { label, value, start, end, total };
  });
}
export function annualBridge(r: Projection): BridgeRow[] {
  return bridge([
    ["Rental income", r.grossRent],
    ["Vacancy", -r.vacancyLoss],
    ["Credit loss", -r.creditLoss],
    ["Concessions", -r.concessions],
    ["Other income", r.otherIncome],
    ["Operating expenses", -r.opex],
    ["NOI", r.noi, true],
    ["Debt service", r.debt ? -r.debt.service : null],
    ["Reserves", -r.reserves],
    ["Capital costs", -r.capex],
    ["Operating cash flow", r.operatingCash, true],
  ]);
}
export function monthlyBridge(p: Project, r: Monthly): BridgeRow[] {
  const economic =
    r.rent + r.other - r.expenses - r.noi - r.concessions - r.creditLoss;
  const physical = r.actual ? 0 : r.vacancy - r.rent * (p.vacancyRate ?? 0);
  return bridge([
    [
      r.actual ? "Actual rental receipts" : "Potential rental income",
      r.rent + physical,
    ],
    ["Vacancy", -(physical + economic)],
    ["Credit loss", -r.creditLoss],
    ["Concessions", -r.concessions],
    ["Other income", r.other],
    ["Operating expenses", -r.expenses],
    ["NOI", r.noi, true],
    ["Debt service", -r.debtService],
    ["Reserves", -r.reserves],
    ["Capital costs", -r.capex],
    ["Operating cash flow", r.noi - r.debtService - r.reserves - r.capex, true],
  ]);
}
export type RecoveryRow = {
  label: string;
  contributions: number | null;
  distributions: number | null;
  sale: number | null;
  operatingDistributions?: number;
};
export function annualRecovery(a: Assumptions, m: Model): RecoveryRow[] {
  let contributions = m.initialEquity,
    distributions = 0;
  return [
    { label: "Year 0", contributions, distributions: 0, sale: 0 },
    ...m.years.slice(0, a.hold).map((r) => {
      if (r.operatingCash !== null) {
        contributions += Math.max(0, -r.operatingCash);
        distributions += Math.max(0, r.operatingCash);
      }
      return {
        label: `Year ${r.year}`,
        contributions: r.operatingCash === null ? null : contributions,
        distributions: r.operatingCash === null ? null : distributions,
        sale: r.year === a.hold ? m.netSale : 0,
      };
    }),
  ];
}
export function monthlyRecovery(p: Project, m: Forecast): RecoveryRow[] {
  let contributions = m.initialEquity,
    distributions = 0,
    sale = 0,
    retainedOperating = 0,
    operatingDistributions = 0;
  return [
    {
      label: p.startDate,
      contributions,
      distributions: 0,
      sale: 0,
      operatingDistributions: 0,
    },
    ...m.rows.map((r) => {
      contributions += r.capitalCall;
      distributions += r.distribution;
      // Attribute retained operating surplus to distributions first. This is a
      // disclosed source-allocation convention; total owner cash timing is unchanged.
      retainedOperating = Math.max(
        0,
        retainedOperating + r.noi - r.debtService - r.capex - r.reserves,
      );
      const operatingPaid = Math.min(retainedOperating, r.distribution);
      operatingDistributions += operatingPaid;
      retainedOperating -= operatingPaid;
      // The engine identifies sale-related debt separately from refinance payoffs.
      if (r.saleNetProceeds !== null)
        sale +=
          r.saleNetProceeds ??
          (r.netSale !== 0 ? r.netSale - r.payoffs - r.fees : 0);
      return {
        label: r.date,
        contributions,
        distributions,
        operatingDistributions,
        sale:
          m.irrReason === "Incomplete terminal disposition." &&
          r.month === p.months
            ? null
            : sale,
      };
    }),
  ];
}
export type TornadoSettings = { amount: number; points: number };
export const defaultTornado: TornadoSettings = { amount: 10, points: 0.5 };
export type TornadoRow = {
  label: string;
  assumption: string;
  lower: number | null;
  higher: number | null;
  lowerReason: string | null;
  higherReason: string | null;
};
export function validTornado(s: TornadoSettings) {
  return (
    Number.isFinite(s.amount) &&
    s.amount > 0 &&
    s.amount < 100 &&
    Number.isFinite(s.points) &&
    s.points > 0 &&
    s.points <= 10
  );
}
export function annualTornado(
  a: Assumptions,
  s: TornadoSettings,
): TornadoRow[] {
  if (!validTornado(s)) return [];
  const base = calculate(a);
  const rows = [
    [
      "Rental income",
      "relative",
      (d: number) => ({
        ...a,
        rent: a.rent * (1 + d),
        occupiedMonthlyRent: a.occupiedMonthlyRent * (1 + d),
      }),
    ],
    [
      "Operating costs",
      "relative",
      (d: number) => ({
        ...a,
        expenses: Object.fromEntries(
          Object.entries(a.expenses).map(([k, v]) => [k, v * (1 + d)]),
        ) as Assumptions["expenses"],
        management: a.management * (1 + d),
      }),
    ],
    ["Vacancy", "points", (d: number) => ({ ...a, vacancy: a.vacancy + d })],
    [
      "Exit cap",
      "points",
      (d: number) => ({
        ...a,
        exitCapMode: "manual" as const,
        exitCap: (base.effectiveExitCap ?? a.exitCap) + d,
      }),
    ],
    ["Interest rate", "points", (d: number) => ({ ...a, rate: a.rate + d })],
  ] as const;
  return tornado(
    rows,
    s,
    base.irr,
    (x) => {
      const m = calculate(x);
      return { value: m.irr, reason: m.errors.join(" ") || m.irrReason };
    },
    a.mode === "rentRoll" ? "Vacancy is not applied in rent-roll mode." : null,
  );
}
export function monthlyTornado(p: Project, s: TornadoSettings): TornadoRow[] {
  if (!validTornado(s)) return [];
  const base = forecast(p);
  const rows = [
    [
      "Rental income",
      "relative",
      (d: number) => ({
        ...p,
        units: p.units.map((u) => ({
          ...u,
          rent: u.rent * (1 + d),
          marketRent: u.marketRent * (1 + d),
          targetRent: u.targetRent * (1 + d),
          renovatedRent: u.renovatedRent * (1 + d),
          events: u.events?.map((e) =>
            e.kind === "rent" || e.kind === "lease"
              ? { ...e, amount: e.amount * (1 + d) }
              : e,
          ),
        })),
      }),
    ],
    [
      "Operating costs",
      "relative",
      (d: number) => ({
        ...p,
        expenses: p.expenses.map((e) => ({
          ...e,
          annual: e.annual * (1 + d),
          replacementAnnual: e.replacementAnnual * (1 + d),
        })),
        management: p.management * (1 + d),
        fixedManagement: (p.fixedManagement ?? 0) * (1 + d),
      }),
    ],
    [
      "Vacancy",
      "points",
      (d: number) => ({ ...p, vacancyRate: (p.vacancyRate ?? 0) + d }),
    ],
    ["Exit cap", "points", (d: number) => ({ ...p, exitCap: p.exitCap + d })],
    [
      "Interest rate",
      "points",
      (d: number) => ({
        ...p,
        loans: p.loans.map((l) => ({
          ...l,
          rate: l.rate + d,
          refiRate: l.refiRate + d,
          ratePoints: l.ratePoints.map((r) => ({ ...r, annual: r.annual + d })),
        })),
      }),
    ],
  ] as const;
  return tornado(rows, s, base.irr, (x) => {
    const m = forecast(x);
    return { value: m.irr, reason: m.errors.join(" ") || m.irrReason };
  });
}
function tornado<T>(
  rows: readonly (readonly [string, string, (d: number) => T])[],
  s: TornadoSettings,
  base: number | null,
  run: (x: T) => { value: number | null; reason: string | null },
  vacancyReason: string | null = null,
): TornadoRow[] {
  return rows
    .map(([label, kind, change]) => {
      const d = kind === "relative" ? s.amount / 100 : s.points / 100;
      const lower = run(change(-d)),
        higher = run(change(d));
      const reason = label === "Vacancy" ? vacancyReason : null;
      return {
        label,
        assumption: `±${kind === "relative" ? s.amount + "%" : s.points + " pp"}`,
        lower:
          reason || base === null || lower.value === null
            ? null
            : (lower.value - base) * 100,
        higher:
          reason || base === null || higher.value === null
            ? null
            : (higher.value - base) * 100,
        lowerReason:
          reason ||
          lower.reason ||
          (base === null ? "Base return is unsupported." : null),
        higherReason:
          reason ||
          higher.reason ||
          (base === null ? "Base return is unsupported." : null),
      };
    })
    .sort(
      (a, b) =>
        Math.max(Math.abs(b.lower ?? 0), Math.abs(b.higher ?? 0)) -
        Math.max(Math.abs(a.lower ?? 0), Math.abs(a.higher ?? 0)),
    );
}
