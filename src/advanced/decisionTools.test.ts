import { describe, it, expect } from "vitest";
import { newProject, newUnit, newLoan } from "./defaults";
import { newTools, baseScenario } from "./toolSchema";
import { forecast, unitMonth } from "./engine";
import {
  scenarioProject,
  renovationPlan,
  applyRenovationPlan,
  absorptionPlan,
  depositLedger,
  breakEven,
  metricValue,
  maxOffer,
  breaksFirst,
  rentPerSqft,
  yearOne,
} from "./decisionAnalytics";
import { cellIndex, storedNumber } from "./benchmark";
import { checkProject } from "./store";
function fixture() {
  const p = newProject();
  Object.assign(p, {
    price: 100000,
    months: 24,
    closing: 0,
    initialCapex: 0,
    openingCash: 0,
    minimumCash: 0,
    management: 0,
    creditLoss: 0,
    otherMonthly: 0,
    reservesMonthly: 0,
    contingency: 0,
    sellingCost: 0,
    rentGrowth: 0,
    exitCap: 0.12,
  });
  p.loans = [];
  p.budget = [];
  p.expenses = [];
  p.units = [
    { ...newUnit(), id: "1", rent: 1000, marketRent: 1000, leaseEnd: 0 },
  ];
  p.lender.periodStart = 1;
  p.tools = newTools();
  return p;
}
describe("focused decision-tool checks", () => {
  it("uses several explicit leasing events without charging rent during downtime", () => {
    const p = fixture();
    p.units[0].events = [
      { id: "v", kind: "vacant", month: 2, duration: 2, amount: 0, note: "" },
      { id: "l", kind: "lease", month: 4, duration: 1, amount: 1500, note: "" },
      { id: "r", kind: "rent", month: 5, duration: 1, amount: 1600, note: "" },
      {
        id: "c",
        kind: "concession",
        month: 5,
        duration: 2,
        amount: 200,
        note: "",
      },
    ];
    expect(
      [1, 2, 3, 4, 5, 6].map((m) => unitMonth(p.units[0], m, p).rent),
    ).toEqual([1000, 0, 0, 1500, 1600, 1600]);
    expect(forecast(p).rows[4].noi).toBe(1400);
  });
  it("stresses financing and lets a rate cap expire without extending maturity", () => {
    const p = fixture();
    p.loans = [
      {
        ...newLoan(),
        amount: 60000,
        fee: 0,
        floating: true,
        rate: 0.12,
        rateCap: 0.07,
        rateCapExpiry: 3,
        ioMonths: 12,
        maturityMonth: 24,
      },
    ];
    const f = forecast(p);
    expect(f.rows[0].debtService).toBeCloseTo(350, 7);
    expect(f.rows[2].debtService).toBeCloseTo(600, 7);
    p.loans[0].refiMonth = 23;
    p.loans[0].refiMaturity = 60;
    const q = scenarioProject(p, { ...baseScenario(), refiDelay: 3 });
    expect(q.loans[0].maturityMonth).toBe(24);
    expect(forecast(q).errors.join(" ")).toContain("refinance");
  });
  it("ranks incremental operating yield and obeys spending/concurrency limits", () => {
    const p = fixture();
    p.months = 36;
    p.units = [
      {
        ...p.units[0],
        renovationCost: 10000,
        renovationMonths: 2,
        renovatedRent: 1500,
        renovationMonth: 1,
      },
      {
        ...p.units[0],
        id: "2",
        renovationCost: 5000,
        renovationMonths: 1,
        renovatedRent: 1400,
        renovationMonth: 1,
      },
      {
        ...p.units[0],
        id: "3",
        renovationCost: 2000,
        renovationMonths: 1,
        renovatedRent: 1050,
        renovationMonth: 1,
      },
    ];
    Object.assign(p.tools!.renovation, {
      budget: 17000,
      monthly: 10000,
      first: 1,
      simultaneous: 1,
    });
    const rank = renovationPlan(p);
    expect(rank[0].id).toBe("2");
    expect(rank[0].annualYield).toBeCloseTo(0.96, 8);
    expect(rank.filter((r) => r.selected).reduce((s, r) => s + r.cost, 0)).toBe(
      15000,
    );
    expect(rank.find((r) => r.id === "3")!.selected).toBe(false);
    for (let m = 1; m <= p.months; m++) {
      const active = rank.filter(
        (r) => r.start !== null && r.start <= m && r.start + r.duration > m,
      );
      expect(active.length).toBeLessThanOrEqual(1);
      expect(
        active.reduce((s, r) => s + r.cost / r.duration, 0),
      ).toBeLessThanOrEqual(10000);
    }
    expect(forecast(applyRenovationPlan(p, rank)).errors).toEqual([]);
  });
  it("keeps sales pacing within delivery limits and separates restricted deposits", () => {
    const p = fixture();
    p.strategy = "development-sale";
    p.units = [
      { ...p.units[0], availableMonth: 5, salePrice: 100000 },
      { ...p.units[0], id: "2", availableMonth: 2, salePrice: 100000 },
      { ...p.units[0], id: "3", availableMonth: 2, salePrice: 100000 },
      { ...p.units[0], id: "4", availableMonth: 2, salePrice: 100000 },
    ];
    Object.assign(p.tools!.absorption, { start: 1, pace: 2, priceGrowth: 0 });
    const units = absorptionPlan(p);
    expect(units.map((u) => u.saleMonth)).toEqual([5, 2, 2, 3]);
    p.units = units;
    p.tools!.absorption.deposits = [
      { id: "d", unit: "1", month: 1, amount: 10000, refundMonth: 0, note: "" },
    ];
    const ledger = depositLedger(p);
    expect(ledger[0].held).toBe(10000);
    expect(ledger[4].released).toBe(10000);
    expect(ledger[4].held).toBe(0);
    const withDeposit = forecast(p);
    p.tools!.absorption.deposits = [];
    expect(forecast(p).initialEquity).toBe(withDeposit.initialEquity);
    expect(forecast(p).npv).toBe(withDeposit.npv);
  });
  it("calculates recurring break-even from fixed expenses and scheduled debt", () => {
    const p = fixture();
    p.units.push({ ...p.units[0], id: "2" });
    p.expenses = [
      {
        id: "e",
        name: "Costs",
        annual: 6000,
        growth: 0,
        startMonth: 1,
        changeMonth: 0,
        replacementAnnual: 0,
        reimbursement: 0,
      },
    ];
    p.loans = [
      {
        ...newLoan(),
        amount: 60000,
        fee: 0,
        rate: 0,
        amortMonths: 120,
        maturityMonth: 120,
      },
    ];
    const f = forecast(p),
      b = breakEven(p, f, 1)!;
    expect(b.billedNeeded).toBe(1000);
    expect(b.occupancy).toBe(0.5);
    expect(metricValue(p, f, "noi")).toBe(18000);
    expect(metricValue(p, f, "debt")).toBe(6000);
    // $40,000 initial equity + $48,000 ending debt − $24,000 retained operating cash.
    expect(b.nominalSale).toBeCloseTo(64000, 6);
  });
  it("maps stored benchmarks and preserves old backups and blank actuals", () => {
    expect(cellIndex("D5")).toEqual([4, 3]);
    expect(storedNumber("$1,234.50")).toBe(1234.5);
    expect(storedNumber("6%")).toBe(0.06);
    expect(() => storedNumber(null)).toThrow();
    expect(() => storedNumber("1,5")).toThrow();
    const p = fixture();
    p.tools!.caseStudy.rows[0].actual = 100000;
    expect(
      checkProject(JSON.parse(JSON.stringify(p))).tools!.caseStudy.rows[1]
        .actual,
    ).toBeNull();
    delete p.tools;
    expect(checkProject(p).name).toBe(p.name);
  });
});
describe("maximum offer, what breaks first and rent per sq ft (ADR-0010)", () => {
  const loan = () => ({
    ...newLoan(),
    amount: 60000,
    fee: 0,
    rate: 0,
    amortMonths: 120,
    maturityMonth: 120,
  });
  const costs = (annual: number) => [
    {
      id: "e",
      name: "Costs",
      annual,
      growth: 0,
      startMonth: 1,
      changeMonth: 0,
      replacementAnnual: 0,
      reimbursement: 0,
    },
  ];
  const at = (p: ReturnType<typeof fixture>, price: number) =>
    yearOne(forecast({ ...p, price }))!;
  const solved = (r: ReturnType<typeof maxOffer>) => {
    if ("error" in r) throw new Error(r.error);
    return r;
  };
  const move = (b: { cash: unknown; dscr: unknown }, k: "cash" | "dscr") =>
    (b[k] as { move: number }).move;
  it("finds the highest price that still meets the return target", () => {
    const p = fixture();
    const r = solved(maxOffer(p, false));
    expect(r.status).toBe("price");
    expect(r.binding!.key).toBe("irr");
    expect(at(p, r.binding!.price!).irr!).toBeGreaterThanOrEqual(p.discount);
    expect(at(p, r.binding!.price! + 100).irr!).toBeLessThan(p.discount);
    // Only the return target is set, so it is the only row.
    expect(r.limits.map((l) => l.key)).toEqual(["irr"]);
  });
  it("reports the limit of each target and the one that binds", () => {
    const p = fixture();
    p.discount = 0;
    // No debt: equity equals price, and cash-on-cash is $12,000 / price.
    p.tools!.criteria = { maxEquity: 90000, minCoc: 0.15, minDscr: 1.2 };
    const r = solved(maxOffer(p, false));
    const byKey = Object.fromEntries(r.limits.map((l) => [l.key, l]));
    expect(byKey.equity.price).toBe(90000);
    expect(byKey.coc.price).toBe(80000);
    // No debt service: coverage cannot fail at any price.
    expect(byKey.dscr).toMatchObject({ kind: "open", fixed: true });
    expect(r.binding).toMatchObject({ key: "coc", price: 80000 });
  });
  it("scales the opening loan when loan-to-price is held, and not otherwise", () => {
    const p = fixture();
    p.discount = 0;
    p.loans = [loan()];
    // DSCR is 2.0x today; 2.5x needs a $48,000 loan, which is 60% of $80,000.
    p.tools!.criteria = { minDscr: 2.5 };
    const held = solved(maxOffer(p, true));
    expect(held.limits.find((l) => l.key === "dscr")).toMatchObject({
      kind: "limit",
      price: 80000,
      fixed: false,
    });
    const fixed = solved(maxOffer(p, false));
    // With the loan amount fixed the miss does not depend on price.
    expect(fixed.limits.find((l) => l.key === "dscr")).toMatchObject({
      kind: "none",
      fixed: true,
    });
    expect(fixed.status).toBe("none");
    expect(fixed.binding).toBeNull();
  });
  it("says so when no price qualifies or the tool does not apply", () => {
    const p = fixture();
    p.discount = 0;
    // Costs exceed rent: Year 1 cash flow is negative at every price.
    p.expenses = costs(15000);
    p.tools!.criteria = { minCoc: 0.01 };
    const r = solved(maxOffer(p, false));
    expect(r.status).toBe("none");
    expect(r.binding).toBeNull();
    expect(
      maxOffer({ ...fixture(), strategy: "existing" }, true),
    ).toHaveProperty("error");
    expect(maxOffer({ ...fixture(), price: 0 }, true)).toHaveProperty("error");
  });
  it("leaves the price open when every target holds across the range", () => {
    const p = fixture();
    p.discount = 0;
    p.exitCap = 0.001; // a very high exit value keeps IRR positive at any price tested
    const r = solved(maxOffer(p, false));
    expect(r.status).toBe("open");
    expect(r.binding).toBeNull();
    expect(r.ceiling).toBe(1_000_000);
  });
  it("ranks how far each variable moves before Year 1 cash flow or DSCR breaks", () => {
    const p = fixture();
    p.expenses = costs(3000);
    p.loans = [loan()];
    // Year 1: rent 12,000, costs 3,000, debt 6,000, so cash is 3,000.
    const plain = breaksFirst(p)!;
    const by = (rows: typeof plain) =>
      Object.fromEntries(rows.map((b) => [b.key, b]));
    const cash = by(plain);
    expect(cash.rent.cash).toMatchObject({ kind: "at" });
    expect(move(cash.rent, "cash")).toBeCloseTo(0.25, 3);
    expect(move(cash.vacancy, "cash")).toBeCloseTo(0.25, 3);
    expect(move(cash.expenses, "cash")).toBeCloseTo(1, 3);
    expect(
      (cash.rent.cash as { funding: number }).funding,
    ).toBeGreaterThanOrEqual(0);
    // No DSCR target saved: the column is empty rather than guessed.
    expect(plain.every((b) => b.dscr === null)).toBe(true);
    // A fixed-rate loan is listed as not applicable, not hidden.
    expect(cash.rate.skipped).toMatch(/fixed-rate/);
    expect(cash.rate.cash).toBeNull();
    expect(
      plain
        .map((b) => b.key)
        .slice(0, 2)
        .sort(),
    ).toEqual(["rent", "vacancy"]);
    expect(plain.at(-1)!.key).toBe("rate");

    // DSCR is 1.5x; a 1.2x target breaks at a 15% rent fall, before cash does.
    p.tools!.criteria = { minDscr: 1.2 };
    expect(move(by(breaksFirst(p)!).rent, "dscr")).toBeCloseTo(0.15, 3);
  });
  it("handles negative cash flow, floating debt and no debt", () => {
    const p = fixture();
    p.expenses = costs(13000);
    const rows = breaksFirst(p)!;
    expect(rows.find((b) => b.key === "rent")!.cash).toEqual({
      kind: "already",
    });
    expect(rows.find((b) => b.key === "rate")!.skipped).toMatch(/no debt/);
    const q = fixture();
    q.loans = [{ ...loan(), rate: 0.05, floating: true, rateCap: 0.5 }];
    const rate = breaksFirst(q)!.find((b) => b.key === "rate")!;
    expect(rate.skipped).toBeUndefined();
    expect(rate.cash).toMatchObject({ kind: "at" });
    // Capped at the current rate, the payment cannot rise far enough to break.
    q.loans[0].rateCap = 0.05;
    expect(breaksFirst(q)!.find((b) => b.key === "rate")!.cash).toEqual({
      kind: "never",
    });
    expect(breaksFirst({ ...q, price: -1 })).toBeNull();
  });
  it("rent per sq ft is total rent over total area and skips blank areas", () => {
    const unit = (
      id: string,
      rent: number,
      sqft?: number,
      occupied = true,
    ) => ({
      ...newUnit(),
      id,
      rent,
      marketRent: rent * 2,
      occupied,
      sqft,
    });
    expect(rentPerSqft([unit("1", 1000)])).toEqual({
      sized: 0,
      current: null,
      market: null,
    });
    const r = rentPerSqft([
      unit("1", 1000, 500),
      unit("2", 3000, 1000),
      unit("3", 9999), // no area: left out of rent and area
      unit("4", 500, 500, false), // vacant: market only
      unit("5", 700, 0), // zero area is blank
    ]);
    expect(r.sized).toBe(3);
    // 4,000 / 1,500, not the 2.5 average of 2.0 and 3.0.
    expect(r.current).toBeCloseTo(4000 / 1500, 10);
    expect(r.market).toBeCloseTo(9000 / 2000, 10);
  });
  it("old projects load without the new fields, and bad values are rejected", () => {
    const p = fixture();
    const old = JSON.parse(JSON.stringify(p));
    expect(old.tools.criteria).toBeUndefined();
    expect(checkProject(old).units[0].sqft).toBeUndefined();
    p.units[0].sqft = 750;
    p.tools!.criteria = { minDscr: 1.25 };
    const back = checkProject(JSON.parse(JSON.stringify(p)));
    expect(back.units[0].sqft).toBe(750);
    expect(back.tools!.criteria).toEqual({ minDscr: 1.25 });
    expect(forecast(back).errors).toEqual([]);
    const bad = JSON.parse(JSON.stringify(p));
    bad.units[0].sqft = "750";
    expect(() => checkProject(bad)).toThrow(/square footage/);
  });
});
describe("what breaks first at the validation edge", () => {
  it("still finds a vacancy break when rates sum to the 100% limit", () => {
    const p = fixture();
    // 0.05 + 0.935 + 0.015 rounds above 1 in floating point.
    Object.assign(p, {
      vacancyRate: 0.05,
      creditLoss: 0.01,
      concessionRate: 0.005,
    });
    p.expenses = [
      {
        id: "e",
        name: "Costs",
        annual: 3000,
        growth: 0,
        startMonth: 1,
        changeMonth: 0,
        replacementAnnual: 0,
        reimbursement: 0,
      },
    ];
    expect(forecast(p).errors).toEqual([]);
    const vacancy = breaksFirst(p)!.find((b) => b.key === "vacancy")!;
    expect(vacancy.cash).toMatchObject({ kind: "at" });
  });
});
