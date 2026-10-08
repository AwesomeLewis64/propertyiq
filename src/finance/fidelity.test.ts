import { describe, it, expect } from "vitest";
import { demo } from "./demo";
import { calculate, operating } from "./model";
import { debtSchedule, monthDays } from "./debt";
import { monthlyFromAnnual, sampleSummary } from "./sharedSample";
import { forecast } from "../advanced/engine";
import { irr } from "./irr";
import { buildGrid } from "./sensitivity";
import { freshAnalysis, decodeSaved, encodeSaved } from "../data/storage";

describe("debt and financial fidelity", () => {
  it("independent Decimal: full 360 months after 24 IO months", () => {
    const s = debtSchedule(1000000, 0.06, 30, 10, 24, 5);
    expect(s.months[23].balance).toBe(1000000);
    expect(s.months[24].payment).toBeCloseTo(5995.505251527524, 8);
  });
  it("independent Decimal: explicit 336-month legacy recast", () => {
    const s = debtSchedule(1000000, 0.06, 30, 10, 24, 5, {
      ioConvention: "consumes-term",
    });
    expect(s.months[24].payment).toBeCloseTo(6151.240166363766, 8);
  });
  it("full amortization after IO accepts IO longer than amortization", () => {
    const a = { ...demo, amortization: 1, interestOnlyMonths: 24 };
    expect(calculate(a).errors).toEqual([]);
    expect(forecast(monthlyFromAnnual(a)).errors).toEqual([]);
    expect(
      calculate({ ...a, ioConvention: "consumes-term" }).errors.length,
    ).toBeGreaterThan(0);
  });
  it("actual/360 uses exact calendar days including leap February", () => {
    const s = debtSchedule(1000000, 0.06, 30, 10, 24, 3, {
      accrual: "actual/360",
      startDate: "2027-01-01",
    });
    expect(s.months[0].interest).toBeCloseTo(5166.666666666667, 8);
    expect(s.months[1].interest).toBeCloseTo(4666.666666666667, 8);
    expect(s.months[13].interest).toBeCloseTo(4833.333333333333, 8);
    expect(s.years[0].service).toBeCloseTo(60833.333333333333, 8);
    expect(monthDays("2028-01-01", 2)).toBe(29);
  });
  it("actual/360 changes interest, preserves nominal scheduled principal", () => {
    const nominal = debtSchedule(1000000, 0.06, 30, 10, 24, 5);
    const actual = debtSchedule(1000000, 0.06, 30, 10, 24, 5, {
      accrual: "actual/360",
    });
    expect(actual.months[59].balance).toBeCloseTo(
      nominal.months[59].balance,
      7,
    );
    expect(actual.years[2].interest).toBeGreaterThan(nominal.years[2].interest);
  });
  it("annual expense categories and reserves compound separately", () => {
    const a = {
      ...demo,
      taxesGrowth: 0.1,
      insuranceGrowth: 0.2,
      inflation: 0.03,
    };
    expect(operating(a, 2).expenses.taxes).toBeCloseTo(61600, 8);
    expect(operating(a, 2).expenses.insurance).toBeCloseTo(28800, 8);
    expect(calculate(a).years[1].reserves).toBeCloseTo(6180, 8);
    expect(calculate(a).years[1].capex).toBeCloseTo(10300, 8);
  });
  it.each([3, 4, 5, 6, 7, 8, 9, 10])("supports a %i year hold", (hold) => {
    const m = calculate({ ...demo, hold });
    expect(m.errors).toEqual([]);
    expect(m.flows).toHaveLength(hold + 1);
    expect(m.years[hold - 1].equityCash).not.toBeNull();
  });
  it.each([2, 11, 4.5])("rejects unsupported hold %i", (hold) =>
    expect(calculate({ ...demo, hold }).errors.length).toBeGreaterThan(0),
  );
  it.each(["ltv", "dscr", "debtYield"])(
    "loan sizing can bind on %s",
    (constraint) => {
      const a = {
        ...demo,
        loanMode: "constraints" as const,
        ltv: constraint === "ltv" ? 0.2 : 0.8,
        minDscr: constraint === "dscr" ? 3 : 1.1,
        minDebtYield: constraint === "debtYield" ? 0.3 : 0.04,
      };
      const m = calculate(a);
      expect(m.bindingConstraint).toBe(constraint);
      expect(m.loan).toBe(Math.min(...Object.values(m.loanLimits!)));
      const independentlyCalculated = {
        ltv: 560000,
        dscr: 1180198.9310385654,
        debtYield: 849106.6666666667,
      };
      expect(m.loan).toBeCloseTo(
        independentlyCalculated[
          constraint as keyof typeof independentlyCalculated
        ],
        6,
      );
    },
  );
  it("DSCR sizing uses amortizing payments during IO", () => {
    const base = calculate({ ...demo, loanMode: "constraints", minDscr: 3 });
    const io = calculate({
      ...demo,
      loanMode: "constraints",
      minDscr: 3,
      interestOnlyMonths: 24,
    });
    expect(io.loan).toBe(base.loan);
  });
  it("tax reassessment valuation satisfies its equation", () => {
    const a = { ...demo, taxReassessment: true, reassessmentRate: 0.025 };
    const m = calculate(a);
    const op = operating(a, a.hold + 1);
    expect(m.grossExit * (m.effectiveExitCap! + 0.025)).toBeCloseTo(
      op.noi + op.expenses.taxes,
      6,
    );
  });
  it("compression is visibly flagged in both engines", () => {
    const a = { ...demo, exitCap: 0.06 };
    expect(calculate(a).warnings.join(" ")).toContain("compression");
    expect(forecast(monthlyFromAnnual(a)).warnings.join(" ")).toContain(
      "compression",
    );
  });
  it("new analyses derive exit cap from going-in cap plus spread", () => {
    const a = { ...freshAnalysis(), price: 1000000, units: 10, rent: 1000 };
    const m = calculate(a);
    expect(m.effectiveExitCap).toBeCloseTo(
      m.years[0].noi / a.price + 0.00625,
      10,
    );
  });
  it("sensitivity includes going-in cap and 100 bps expansion", () => {
    const cap = calculate(demo).years[0].noi / demo.price;
    const grid = buildGrid(demo, "rent");
    expect(grid.rows).toContain(cap);
    expect(grid.rows).toContain(cap + 0.01);
  });
  it("legacy saved analyses remain readable with optional fields absent", () => {
    const a = structuredClone(demo);
    for (const key of [
      "taxesGrowth",
      "insuranceGrowth",
      "inflation",
      "taxReassessment",
      "reassessmentRate",
      "exitCapMode",
      "exitSpread",
      "requiredReturn",
      "minDscr",
      "minDebtYield",
      "ioConvention",
      "accrual",
      "startDate",
    ] as const)
      delete a[key];
    expect(
      decodeSaved(
        encodeSaved([
          {
            id: "legacy",
            name: "legacy",
            savedAt: "2026-10-08",
            assumptions: a,
            scenarios: { upside: {}, downside: {} },
          },
        ]),
      ),
    ).toHaveLength(1);
  });
});
describe("engine parity from identical assumptions", () => {
  it.each([
    ["sample", {}],
    [
      "fixed management growth",
      { managementMode: "fixed" as const, management: 20000 },
    ],
    [
      "occupied rent roll",
      { mode: "rentRoll" as const, occupiedMonthlyRent: 32000 },
    ],
    [
      "distinct category growth",
      {
        taxesGrowth: 0.08,
        insuranceGrowth: 0.12,
        expenseGrowth: 0.03,
        inflation: 0.04,
      },
    ],
    ["IO", { interestOnlyMonths: 24 }],
    [
      "legacy IO",
      { interestOnlyMonths: 24, ioConvention: "consumes-term" as const },
    ],
    ["actual/360", { accrual: "actual/360" as const }],
    ["no debt", { ltv: 0 }],
    ["tax reassessment", { taxReassessment: true }],
    ["10 year hold", { hold: 10 }],
    ["constrained sizing", { loanMode: "constraints" as const, minDscr: 2.5 }],
  ])(
    "%s: operations, payoff and annualized cash flows reconcile",
    (_name, overrides) => {
      const a = { ...demo, ...overrides };
      const annual = calculate(a);
      const monthly = forecast(monthlyFromAnnual(a));
      expect(monthly.errors).toEqual([]);
      expect(monthly.initialEquity).toBeCloseTo(annual.initialEquity, 6);
      const rollup = [-monthly.initialEquity];
      for (let year = 0; year < a.hold; year++) {
        const rows = monthly.rows.slice(year * 12, year * 12 + 12);
        expect(rows.reduce((s, r) => s + r.noi, 0)).toBeCloseTo(
          annual.years[year].noi,
          6,
        );
        rollup.push(rows.reduce((s, r) => s + r.equityFlow, 0));
        if (year < a.hold - 1)
          expect(rows.at(-1)!.balance).toBeCloseTo(
            annual.years[year].debt!.balance,
            6,
          );
      }
      const last = monthly.rows.at(-1)!;
      expect(last.netSale - last.payoffs).toBeCloseTo(annual.netSale!, 6);
      const exitPayoff = monthly.debt
        .filter((r) => r.month === a.hold * 12)
        .reduce((s, r) => s + r.payoff, 0);
      expect(exitPayoff).toBeCloseTo(annual.years[a.hold - 1].debt!.balance, 6);
      expect(irr(rollup).value).toBeCloseTo(annual.irr!, 10);
      // Monthly distributions occur earlier. Dated XIRR is intentionally different.
      expect(Math.abs(monthly.irr! - annual.irr!)).toBeLessThan(0.01);
    },
  );
  it("landing-page summary has the same income figures as both workspaces", () => {
    const s = sampleSummary(),
      m = calculate(demo),
      f = forecast(monthlyFromAnnual(demo));
    expect(s.noi).toBe(m.years[0].noi);
    expect(s.noi).toBeCloseTo(
      f.rows.slice(0, 12).reduce((n, r) => n + r.noi, 0),
      6,
    );
    expect(s.expenses).toBe(m.years[0].opex);
  });
});
