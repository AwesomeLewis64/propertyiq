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
