import { describe, it, expect } from "vitest";
import { demo } from "./demo";
import { calculate } from "./model";
import { refinanceCheck, sellVsHold } from "./transactions";
import type { Assumptions } from "./types";

// Standard amortization factors (payment per $1 of loan, monthly):
// 6.00% / 30 years = 0.0059955053, 7.00% / 25 years = 0.0070677899,
// 6.00% / 25 years = 0.0064430143.
const base = {
  value: 2_000_000,
  noi: 150_000,
  balance: 1_000_000,
  currentRate: 0.07,
  currentYearsLeft: 25,
  newRate: 0.06,
  newYears: 30,
  maxLtv: 0.65,
  minDscr: 1.25,
  closingPct: 0.01,
};

describe("refinance check", () => {
  it("sizes a cash-out loan by LTV and reports payment, DSCR and cash at closing", () => {
    const r = refinanceCheck(base);
    expect(r.errors).toEqual([]);
    expect(r.maxByLtv).toBe(1_300_000);
    expect(r.binding).toBe("ltv");
    expect(r.newLoan).toBe(1_300_000);
    expect(r.closingCosts).toBe(13_000);
    expect(r.cashOut).toBe(287_000);
    expect(r.newPayment).toBeCloseTo(1_300_000 * 0.0059955053, 0);
    expect(r.currentPayment).toBeCloseTo(1_000_000 * 0.0070677899, 0);
    expect(r.newDscr).toBeCloseTo(150_000 / (12 * r.newPayment), 10);
    // Payment rises with the extra borrowing, so there is no payback month.
    expect(r.paymentChange).toBeGreaterThan(0);
    expect(r.breakEvenMonths).toBeNull();
  });
  it("lets coverage bind when NOI is thin", () => {
    const r = refinanceCheck({ ...base, noi: 60_000 });
    // 60,000 / 1.25 / 12 = 4,000 per month at 0.0059955053 per $1.
    expect(r.binding).toBe("dscr");
    expect(r.newLoan).toBeCloseTo(4_000 / 0.0059955053, 0);
    expect(r.newDscr).toBeCloseTo(1.25, 6);
  });
  it("finds the months a rate drop takes to repay closing costs", () => {
    const r = refinanceCheck({
      ...base,
      maxLtv: 0.5, // new loan equals the 1,000,000 balance
      newYears: 25,
    });
    expect(r.newLoan).toBe(1_000_000);
    expect(r.cashOut).toBe(-10_000); // closing costs paid in cash
    const saving = 1_000_000 * (0.0070677899 - 0.0064430143);
    expect(r.paymentChange).toBeCloseTo(-saving, 0);
    expect(r.breakEvenMonths).toBeCloseTo(10_000 / saving, 1);
  });
  it("rejects impossible inputs instead of returning numbers", () => {
    expect(refinanceCheck({ ...base, value: 0 }).errors).not.toEqual([]);
    expect(refinanceCheck({ ...base, newRate: 1.5 }).errors).not.toEqual([]);
    expect(refinanceCheck({ ...base, maxLtv: 1.2 }).errors).not.toEqual([]);
  });
});

// Flat income, no debt, no reserves: every hold-year flow is the same NOI and
// the last adds the sale, so present values have a closed form.
const flat: Assumptions = {
  ...structuredClone(demo),
  rentGrowth: 0,
  otherGrowth: 0,
  expenseGrowth: 0,
  taxesGrowth: 0,
  insuranceGrowth: 0,
  inflation: 0,
  taxReassessment: false,
  reserves: 0,
  annualCapex: 0,
  loanMode: "amount",
  loanAmount: 0,
  exitCapMode: "manual",
  exitCap: 0.07,
  sellingCosts: 0.03,
  closingCosts: 0,
  initialCapex: 0,
  loanFee: 0,
};
describe("sell vs hold", () => {
  const noi = calculate(flat).years[0].noi;
  const d = 0.1;
  const n = 5;
  const gross = noi / 0.07;
  const holdPv =
    Array.from({ length: n }, (_, t) => noi / (1 + d) ** (t + 1)).reduce(
      (s, v) => s + v,
      0,
    ) +
    (gross * 0.97) / (1 + d) ** n;
  it("discounts the hold-case cash flows and compares them with selling today", () => {
    const r = sellVsHold(flat, {
      value: 2_500_000,
      balance: 0,
      sellingCosts: 0.03,
      holdYears: n,
      discountRate: d,
    });
    expect(r.errors).toEqual([]);
    expect(r.sellNowNet).toBeCloseTo(2_500_000 * 0.97, 6);
    expect(r.holdPresentValue).toBeCloseTo(holdPv, 4);
    expect(r.advantage).toBeCloseTo(holdPv - 2_500_000 * 0.97, 4);
  });
  it("finds the exit cap where holding and selling are worth the same", () => {
    // Sell-now equals the hold value at a 7% exit cap, so break-even is 7%.
    const r = sellVsHold(flat, {
      value: holdPv / 0.97,
      balance: 0,
      sellingCosts: 0.03,
      holdYears: n,
      discountRate: d,
    });
    expect(r.advantage).toBeCloseTo(0, 4);
    expect(r.breakEvenExitCap).toBeCloseTo(0.07, 5);
  });
  it("reports when holding wins or loses at every exit cap in range", () => {
    const cheap = sellVsHold(flat, {
      value: 100_000,
      balance: 0,
      sellingCosts: 0.03,
      holdYears: n,
      discountRate: d,
    });
    expect(cheap.holdWinsAtAnyCap).toBe(true);
    const dear = sellVsHold(flat, {
      value: 50_000_000,
      balance: 0,
      sellingCosts: 0.03,
      holdYears: n,
      discountRate: d,
    });
    expect(dear.holdWinsAtAnyCap).toBe(false);
  });
  it("validates its inputs", () => {
    const bad = sellVsHold(flat, {
      value: 0,
      balance: 0,
      sellingCosts: 0.03,
      holdYears: 2,
      discountRate: d,
    });
    expect(bad.errors.length).toBe(2);
  });
});
