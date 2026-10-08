import { describe, expect, it } from "vitest";
import { newLoan, newProject, newUnit } from "./defaults";
import { forecast, unitMonth, validateProject } from "./engine";
import { dateAt, xirr, xnpv } from "./returns";
import { applyTable, mapDefault } from "./import";
import { checkProject, decodeWorkspace } from "./store";
import { simulate } from "./risk";
import type { Project } from "./types";

function simple(): Project {
  const p = newProject();
  Object.assign(p, {
    price: 100000,
    closing: 0,
    initialCapex: 0,
    openingCash: 0,
    minimumCash: 0,
    months: 12,
    rentGrowth: 0,
    creditLoss: 0,
    otherMonthly: 0,
    management: 0,
    reservesMonthly: 0,
    contingency: 0,
    exitCap: 0.12,
    sellingCost: 0,
    distribute: false,
  });
  p.units = [{ ...newUnit(), rent: 1000, marketRent: 1500, leaseEnd: 0 }];
  p.loans = [];
  p.expenses = [];
  p.budget = [];
  p.lender.periodStart = 1;
  return p;
}
const loan = (p: Project, changes = {}) => {
  p.loans = [
    {
      ...newLoan(),
      amount: 60000,
      fee: 0,
      rate: 0,
      amortMonths: 120,
      maturityMonth: 120,
      ...changes,
    },
  ];
  return p;
};
const raw = (headers: string[], rows: (string | number)[][]) => ({
  headers,
  rows,
  rowNumbers: rows.map((_, i) => i + 2),
});

describe("monthly operations and liquidity", () => {
  it("keeps four fictional strategies valid and finite", () => {
    for (const strategy of [
      "acquisition",
      "existing",
      "development-sale",
      "development-hold",
    ] as const) {
      const f = forecast(newProject(strategy));
      expect(f.errors).toEqual([]);
      expect(f.rows.length).toBeGreaterThanOrEqual(36);
      expect(f.rows.every((r) => Number.isFinite(r.noi))).toBe(true);
    }
  });
  it("does not annualize the target rent before its effective month", () => {
    const p = simple();
    p.units[0].targetMonth = 11;
    p.units[0].targetRent = 1450;
    const f = forecast(p);
    expect(f.rows.slice(0, 10).reduce((s, r) => s + r.rent, 0)).toBe(10000);
    expect(f.rows.reduce((s, r) => s + r.rent, 0)).toBe(12900);
  });
  it("links renovation downtime, spend, contingency, and new rent", () => {
    const p = simple();
    p.contingency = 0.1;
    Object.assign(p.units[0], {
      renovationMonth: 2,
      renovationMonths: 2,
      renovationCost: 10000,
      renovatedRent: 1600,
    });
    const f = forecast(p);
    expect(f.rows.slice(0, 4).map((r) => r.rent)).toEqual([1000, 0, 0, 1600]);
    expect(f.rows.slice(0, 4).map((r) => r.capex)).toEqual([0, 5500, 5500, 0]);
  });
  it("models initial vacancy and leasing concessions without double vacancy", () => {
    const p = simple();
    Object.assign(p.units[0], {
      occupied: false,
      availableMonth: 3,
      concession: 500,
      concessionMonths: 2,
    });
    const f = forecast(p);
    expect(f.rows.slice(0, 5).map((r) => r.noi)).toEqual([
      0, 0, 1000, 1000, 1500,
    ]);
  });
  it("models one turnover event then the market rent", () => {
    const p = simple();
    Object.assign(p.units[0], {
      leaseEnd: 2,
      renewal: "vacate",
      turnoverMonths: 2,
    });
    expect(
      [1, 2, 3, 4, 5].map((m) => unitMonth(p.units[0], m, p).rent),
    ).toEqual([1000, 1000, 0, 0, 1500]);
  });
  it("starts renewal increases after expiry, and resets growth at a new target", () => {
    const p = simple();
    p.months = 36;
    Object.assign(p.units[0], {
      leaseEnd: 12,
      renewalIncrease: 0.1,
      targetMonth: 18,
      targetRent: 1500,
    });
    expect(unitMonth(p.units[0], 13, p).rent).toBeCloseTo(1100);
    expect(unitMonth(p.units[0], 18, p).rent).toBe(1500);
    expect(unitMonth(p.units[0], 25, p).rent).toBeCloseTo(1650);
  });
  it("allows expense reassessment and reimbursement independently", () => {
    const p = simple();
    p.expenses = [
      {
        id: "tax",
        name: "Taxes",
        annual: 1200,
        growth: 0,
        startMonth: 1,
        changeMonth: 3,
        replacementAnnual: 2400,
        reimbursement: 50,
      },
    ];
    const f = forecast(p);
    expect(f.rows.slice(0, 3).map((r) => r.noi)).toEqual([950, 950, 850]);
  });
  it("reports cash shortfalls even when annual NOI is positive", () => {
    const p = simple();
    p.openingCash = 500;
    p.minimumCash = 500;
    p.budget = [
      {
        id: "b",
        name: "Repair",
        category: "other",
        amount: 5000,
        start: 1,
        duration: 1,
        debtEligible: false,
      },
    ];
    const f = forecast(p);
    expect(f.rows[0].cashBefore).toBe(-3500);
    expect(f.rows[0].capitalCall).toBe(4000);
    expect(f.additionalEquity).toBe(4000);
    expect(f.rows[0].cash).toBe(500);
    expect(f.rows.reduce((s, r) => s + r.noi, 0)).toBe(12000);
  });
  it("reconciles every cash ledger and total contribution/distribution", () => {
    const p = newProject();
    const f = forecast(p);
    let cash = p.openingCash;
    for (const r of f.rows) {
      const net =
        r.noi -
        r.capex -
        r.reserves -
        r.debtService +
        r.draws +
        r.refinance -
        r.payoffs -
        r.fees +
        r.netSale;
      expect(r.cashBefore).toBeCloseTo(cash + net, 6);
      expect(r.cash).toBeCloseTo(
        r.cashBefore + r.capitalCall - r.distribution,
        6,
      );
      cash = r.cash;
    }
    expect(f.flows.reduce((s, v) => s + v.amount, 0)).toBeCloseTo(
      f.totalProfit,
      6,
    );
    expect(f.partners.reduce((s, v) => s + v.contributed, 0)).toBeCloseTo(
      f.initialEquity + f.additionalEquity,
      6,
    );
    expect(f.partners.reduce((s, v) => s + v.distributed, 0)).toBeCloseTo(
      f.rows.reduce((s, r) => s + r.distribution, 0),
      6,
    );
  });
  it("uses entered as-of equity instead of charging the acquisition again", () => {
    const p = loan(simple());
    p.strategy = "existing";
    p.asOfEquity = 55000;
    const f = forecast(p);
    expect(f.initialEquity).toBe(55000);
    p.historical = [{ date: "2025-04-01", amount: -40000, note: "closing" }];
    expect(forecast(p).inceptionIrr).not.toBeNull();
  });
  it("overrides actual cash flows without claiming loan-balance reconciliation", () => {
    const p = loan(simple());
    p.actuals = [
      {
        month: "2026-04",
        rent: 2000,
        otherIncome: 100,
        opex: 300,
        capex: 400,
        debtService: 600,
      },
    ];
    const f = forecast(p);
    const r = f.rows[0];
    expect(r.noi).toBe(1800);
    expect(r.debtService).toBe(600);
    expect(r.capex).toBe(400);
    expect(r.balance).toBe(59500);
    expect(f.warnings.join(" ")).toContain(
      "do not replace modeled loan balances",
    );
  });
});

describe("debt, development, sizing, and investors", () => {
  it("matches an independently calculated mortgage payment and 12-month balance", () => {
    const p = loan(simple(), { amount: 50000, rate: 0.06, amortMonths: 360 });
    const f = forecast(p);
    expect(f.rows[0].debtService).toBeCloseTo(299.7752625763762, 8);
    expect(
      f.debt.find((r) => r.month === 12 && !r.loan.includes("exit"))?.balance,
    ).toBeCloseTo(49385.99414386164, 6);
  });
  it("recasts after IO over the remaining original term", () => {
    const p = loan(simple(), {
      amount: 60000,
      rate: 0.06,
      amortMonths: 120,
      ioMonths: 2,
      ioConvention: "consumes-term",
    });
    const f = forecast(p);
    expect(f.rows[0].debtService).toBe(300);
    expect(f.rows[1].debtService).toBe(300);
    const expected = (60000 * 0.005) / (1 - Math.pow(1.005, -118));
    expect(f.rows[2].debtService).toBeCloseTo(expected, 8);
  });
  it("caps floating rates and changes interest at the scheduled reset", () => {
    const p = loan(simple(), {
      rate: 0.06,
      ioMonths: 12,
      amortMonths: 120,
      floating: true,
      rateCap: 0.08,
      ratePoints: [{ month: 3, annual: 0.12 }],
    });
    const f = forecast(p);
    expect(f.rows.slice(0, 3).map((r) => r.debtService)).toEqual([
      300, 300, 400,
    ]);
  });
  it("funds maturity balloon through disclosed calls, then ends the loan", () => {
    const p = loan(simple(), { maturityMonth: 3 });
    const f = forecast(p);
    expect(f.rows[2].payoffs).toBe(58500);
    expect(f.rows[2].capitalCall).toBe(57000);
    expect(f.rows[3].balance).toBe(0);
    expect(f.rows[3].debtService).toBe(0);
  });
  it("refinances after regular payment and applies fees only once", () => {
    const p = loan(simple(), {
      refiMonth: 3,
      refiAmount: 65000,
      refiRate: 0,
      refiAmort: 120,
      refiFee: 0.01,
      refiMaturity: 120,
    });
    const f = forecast(p);
    expect(f.rows[2].refinance).toBe(65000);
    expect(f.rows[2].payoffs).toBe(58500);
    expect(f.rows[2].fees).toBe(650);
    expect(f.rows[3].debtService).toBeCloseTo(65000 / 120, 8);
  });
  it("draws only eligible costs and respects the construction commitment", () => {
    const p = loan(simple(), {
      kind: "construction",
      amount: 50000,
      ltc: 0.5,
      capitalizeInterest: false,
    });
    p.price = 1000;
    p.budget = [
      {
        id: "b",
        name: "Build",
        category: "hard",
        amount: 100000,
        start: 1,
        duration: 2,
        debtEligible: true,
      },
    ];
    const f = forecast(p);
    expect(f.initialEquity).toBe(500);
    expect(f.rows[0].draws).toBe(25000);
    expect(f.rows[1].draws).toBe(24500);
    expect(f.rows[2].draws).toBe(0);
  });
  it("capitalizes construction interest only within available commitment", () => {
    const p = loan(simple(), {
      kind: "construction",
      amount: 505,
      rate: 0.12,
      ltc: 0.5,
      capitalizeInterest: true,
    });
    p.price = 1000;
    const f = forecast(p);
    expect(f.debt[0].capitalized).toBe(5);
    expect(f.rows[0].debtService).toBe(0);
    expect(f.rows[1].debtService).toBeCloseTo(5.05, 8);
  });
  it("sizes to the lowest DSCR/LTV/debt-yield constraint", () => {
    const p = loan(simple(), { amount: 90000 });
    Object.assign(p.lender, {
      reserveAnnual: 1200,
      adjustmentAnnual: 0,
      stressRate: 0.1,
      useIO: true,
      minDscr: 1.25,
      value: 100000,
      maxLtv: 0.8,
      minYield: 0.1,
    });
    const f = forecast(p);
    expect(f.sizing.ncf).toBe(10800);
    expect(f.sizing.dscrLoan).toBeCloseTo(86400);
    expect(f.sizing.maximum).toBe(80000);
    expect(f.sizing.binding).toBe("LTV");
    expect(f.sizing.extraEquity).toBe(10000);
    p.lender.maxLtv = 1;
    p.lender.minYield = 0.2;
    expect(forecast(p).sizing.maximum).toBe(54000);
  });
  it("models phased sales and debt releases separately from sale receipts", () => {
    const p = loan(simple(), {
      kind: "construction",
      amount: 60000,
      ltc: 0.6,
      releasePercent: 0.5,
    });
    p.strategy = "development-sale";
    p.units[0].saleMonth = 3;
    p.units[0].salePrice = 120000;
    p.sellingCost = 0.1;
    const f = forecast(p);
    expect(f.rows[2].sales).toBe(120000);
    expect(f.rows[2].netSale).toBe(108000);
    expect(f.rows[2].payoffs).toBe(54000);
    expect(f.rows[2].balance).toBe(6000);
    expect(f.rows.at(-1)?.balance).toBe(0);
    expect(f.rows.at(-1)?.payoffs).toBe(6000);
  });
  it("suppresses incomplete development exits and invalid rental valuation", () => {
    const p = simple();
    p.strategy = "development-sale";
    p.units[0].saleMonth = 0;
    expect(forecast(p).npv).toBeNull();
    expect(forecast(p).irr).toBeNull();
    p.strategy = "acquisition";
    p.units[0].rent = 0;
    expect(forecast(p).grossExit).toBeNull();
  });
  it("keeps waterfall allocations equal to project distributions", () => {
    const p = simple();
    p.waterfall.enabled = true;
    p.waterfall.preferred = 0.08;
    p.waterfall.promote = 0.2;
    const f = forecast(p);
    expect(f.partners.reduce((s, v) => s + v.distributed, 0)).toBeCloseTo(
      112000,
      6,
    );
    expect(f.partners.reduce((s, v) => s + v.endingCapital, 0)).toBeCloseTo(
      0,
      6,
    );
    expect(f.partners.find((v) => v.id === "gp")!.distributed).toBeGreaterThan(
      11200,
    );
  });
  it("applies entered tax assumptions outside the project cash ledger", () => {
    const p = simple();
    p.tax.enabled = true;
    p.tax.ordinaryRate = 0.25;
    p.tax.annualDepreciation = 0;
    p.tax.saleBasis = 100000;
    const f = forecast(p);
    expect(f.rows[0].tax).toBe(250);
    expect(f.rows[0].afterTaxFlow).toBe(-250);
    expect(f.rows[0].cash).toBe(1000);
    expect(f.afterTaxIrr).not.toBeNull();
  });
});

describe("dated returns and invalid inputs", () => {
  it("uses real month-end dates including leap years", () => {
    expect(dateAt("2024-01-01", 1, true)).toBe("2024-02-29");
    expect(dateAt("2026-12-01", 1)).toBe("2027-01-01");
  });
  it("matches a literal 365-day 10% return and NPV", () => {
    const f = [
      { date: "2025-01-01", amount: -100 },
      { date: "2026-01-01", amount: 110 },
    ];
    expect(xirr(f).value).toBeCloseTo(0.1, 9);
    expect(xnpv(f, 0.1)).toBeCloseTo(0, 9);
  });
  it("rejects ambiguous signs and merges same-date flows", () => {
    expect(
      xirr([
        { date: "2025-01-01", amount: -100 },
        { date: "2026-01-01", amount: 200 },
        { date: "2027-01-01", amount: -100 },
      ]).value,
    ).toBeNull();
    expect(
      xirr([
        { date: "2025-01-01", amount: -80 },
        { date: "2025-01-01", amount: -20 },
        { date: "2026-01-01", amount: 110 },
      ]).value,
    ).toBeCloseTo(0.1, 9);
  });
  it("rejects impossible dates rather than rolling them into another month", () => {
    const p = simple();
    p.startDate = "2026-13-01";
    expect(validateProject(p).length).toBeGreaterThan(0);
    p.startDate = "2026-04-01";
    p.historical = [{ date: "2026-02-30", amount: -100, note: "" }];
    expect(validateProject(p).length).toBeGreaterThan(0);
  });
  it("rejects negative reserves and negative income assumptions", () => {
    const p = simple();
    p.reservesMonthly = -1;
    expect(forecast(p).errors.length).toBeGreaterThan(0);
    p.reservesMonthly = 0;
    p.otherMonthly = -1;
    expect(forecast(p).errors.length).toBeGreaterThan(0);
  });
  it("rejects duplicate units, nonfinite terms, and invalid ownership", () => {
    const p = simple();
    p.units.push({ ...p.units[0] });
    expect(forecast(p).rows).toEqual([]);
    p.units.pop();
    p.price = NaN;
    expect(forecast(p).errors.length).toBeGreaterThan(0);
    p.price = 100000;
    p.partners[0].share = 0.5;
    expect(forecast(p).errors.length).toBeGreaterThan(0);
  });
});

describe("imports, backups, and scenario risk", () => {
  it("maps aliases and never invents future rent or sales on import", () => {
    const p = simple();
    const r = raw(
      ["Unit", "Status", "Monthly Contract Rent"],
      [["A", "vacant", 0]],
    );
    const result = applyTable(p, r, "units", mapDefault(r.headers, "units"));
    const u = result.units[0];
    expect(u.marketRent).toBe(0);
    expect(u.salePrice).toBe(0);
    expect(u.targetMonth).toBe(0);
    expect(u.availableMonth).toBe(25);
    expect(p.units[0].id).toBe("1");
  });
  it("maps ISO lease dates to containing forecast months", () => {
    const p = simple();
    const r = raw(
      ["id", "occupied", "rent", "leaseEnd"],
      [["A", "occupied", 1000, "2027-02-15"]],
    );
    expect(
      applyTable(p, r, "units", mapDefault(r.headers, "units")).units[0]
        .leaseEnd,
    ).toBe(11);
    r.rows[0][3] = "2027-02-30";
    expect(() =>
      applyTable(p, r, "units", mapDefault(r.headers, "units")),
    ).toThrow(/calendar date/);
  });
  it("parses currency/percent values but rejects ambiguous commas", () => {
    const p = simple();
    const r = raw(
      ["field", "value"],
      [
        ["price", "$100,000"],
        ["rentGrowth", "3%"],
      ],
    );
    const q = applyTable(
      p,
      r,
      "assumptions",
      mapDefault(r.headers, "assumptions"),
    );
    expect(q.price).toBe(100000);
    expect(q.rentGrowth).toBe(0.03);
    expect(() =>
      applyTable(
        p,
        raw(r.headers, [["price", "1,5"]]),
        "assumptions",
        mapDefault(r.headers, "assumptions"),
      ),
    ).toThrow(/ambiguous/);
  });
  it("requires explicit unique mappings and valid unit status", () => {
    const p = simple();
    const r = raw(["id", "occupied", "rent"], [["A", "unknown", 1000]]);
    expect(() => applyTable(p, r, "units", {})).toThrow(/required/);
    expect(() =>
      applyTable(p, r, "units", { id: 0, occupied: 1, rent: 1 }),
    ).toThrow(/once/);
    expect(() =>
      applyTable(p, r, "units", mapDefault(r.headers, "units")),
    ).toThrow(/occupied/);
  });
  it("aggregates categorized ledger rows into monthly actuals", () => {
    const r = raw(
      ["date", "category", "amount"],
      [
        ["2026-04-01", "rent", 1000],
        ["2026-04-02", "rent", 500],
        ["2026-04-03", "opex", 300],
      ],
    );
    const q = applyTable(
      simple(),
      r,
      "ledger",
      mapDefault(r.headers, "ledger"),
    );
    expect(q.actuals[0]).toEqual({
      month: "2026-04",
      rent: 1500,
      otherIncome: 0,
      opex: 300,
      capex: 0,
      debtService: 0,
    });
  });
  it("imports expense, budget, loan, actual, and historical destinations", () => {
    const p = simple();
    const datasets = [
      ["expenses", ["name", "annual", "growth"], [["Insurance", 12000, "4%"]]],
      [
        "budget",
        ["name", "amount", "start", "duration"],
        [["Roof", 12000, 1, 2]],
      ],
      [
        "loans",
        ["name", "amount", "rate", "amortMonths", "maturityMonth"],
        [["Bank", 60000, "6%", 360, 60]],
      ],
      [
        "actuals",
        ["month", "rent", "otherIncome", "opex", "capex", "debtService"],
        [["2026-04", 1000, 100, 300, 0, 500]],
      ],
      ["historical", ["date", "amount"], [["2025-04-01", "($50,000)"]]],
    ] as const;
    for (const [kind, headers, rows] of datasets) {
      const r = raw(
        [...headers],
        rows.map((v) => [...v]),
      );
      const q = applyTable(p, r, kind, mapDefault(r.headers, kind));
      expect(validateProject(q)).toEqual([]);
      expect(q[kind]).toHaveLength(1);
    }
  });
  it("reconciles each debt record across all four strategies", () => {
    for (const strategy of [
      "acquisition",
      "existing",
      "development-sale",
      "development-hold",
    ] as const) {
      for (const r of forecast(newProject(strategy)).debt)
        expect(
          r.opening +
            r.draw +
            r.capitalized -
            r.principal -
            r.payoff +
            r.refinance,
        ).toBeCloseTo(r.balance, 5);
    }
  });
  it("rejects unit sales before delivery", () => {
    const p = simple();
    p.strategy = "development-sale";
    p.units[0].saleMonth = 2;
    p.units[0].availableMonth = 3;
    expect(forecast(p).errors.join(" ")).toContain(
      "sale cannot precede delivery",
    );
  });
  it("round-trips versioned workspaces and rejects corrupt/duplicate records", () => {
    const p = simple();
    const text = JSON.stringify({ version: 2, projects: [p], revisions: [] });
    expect(decodeWorkspace(text).projects[0]).toEqual(p);
    expect(() =>
      decodeWorkspace(
        JSON.stringify({ version: 2, projects: [p, p], revisions: [] }),
      ),
    ).toThrow(/Duplicate/);
    expect(() => checkProject({ ...p, units: [{ id: "bad" }] })).toThrow();
  });
  it("matches constant Monte Carlo ranges to the base case and is repeatable", () => {
    const p = simple();
    Object.assign(p.risk, {
      trials: 10,
      rentLow: 1,
      rentHigh: 1,
      capLow: 0.12,
      capHigh: 0.12,
      costLow: 1,
      costHigh: 1,
      delayMax: 0,
    });
    const result = simulate(p);
    expect(result.valid).toBe(10);
    expect(result.excluded).toBe(0);
    expect(result.npvP50).toBeCloseTo(forecast(p).npv!, 6);
    expect(simulate(p)).toEqual(result);
  });
  it("counts incomplete simulation cases as exclusions", () => {
    const p = simple();
    p.strategy = "development-sale";
    p.units[0].saleMonth = 0;
    p.risk.trials = 10;
    const r = simulate(p);
    expect(r.excluded).toBe(10);
    expect(r.lossProbability).toBeNull();
    p.risk.trials = 0;
    expect(() => simulate(p)).toThrow();
  });
});
