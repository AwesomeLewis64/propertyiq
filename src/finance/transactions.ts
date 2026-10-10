import { calculate } from "./model";
import { payment } from "./debt";
import { irr } from "./irr";
import type { Assumptions } from "./types";

// Refinance and sell-vs-hold checks. Pure functions over entered numbers and the
// existing annual model; nothing here changes how calculate() works (ADR-0009).

export type RefinanceInput = {
  value: number; // what the property is worth now
  noi: number; // annual NOI used for coverage
  balance: number; // current loan balance
  currentRate: number; // annual, decimal
  currentYearsLeft: number; // remaining amortization, years
  newRate: number; // annual, decimal
  newYears: number; // new amortization, years
  maxLtv: number; // decimal
  minDscr: number; // x
  closingPct: number; // share of the new loan, decimal
};
export type RefinanceResult = {
  errors: string[];
  maxByLtv: number;
  maxByDscr: number;
  binding: "ltv" | "dscr";
  newLoan: number;
  closingCosts: number;
  /** New loan less payoff less closing costs; negative means cash in. */
  cashOut: number;
  currentPayment: number;
  newPayment: number;
  paymentChange: number;
  currentDscr: number | null;
  newDscr: number | null;
  /** Months of monthly saving needed to repay closing costs; null if no saving. */
  breakEvenMonths: number | null;
};

export function refinanceCheck(i: RefinanceInput): RefinanceResult {
  const errors: string[] = [];
  const positive = (n: number) => Number.isFinite(n) && n > 0;
  if (!positive(i.value))
    errors.push("Current value must be greater than zero.");
  if (!Number.isFinite(i.balance) || i.balance < 0)
    errors.push("Current loan balance cannot be negative.");
  for (const [rate, label] of [
    [i.currentRate, "Current rate"],
    [i.newRate, "New rate"],
  ] as const)
    if (!Number.isFinite(rate) || rate < 0 || rate > 1)
      errors.push(`${label} must be between 0% and 100%.`);
  if (!positive(i.currentYearsLeft) || !positive(i.newYears))
    errors.push("Amortization years must be greater than zero.");
  if (!positive(i.maxLtv) || i.maxLtv > 1)
    errors.push("Maximum LTV must be above 0% and no more than 100%.");
  if (!positive(i.minDscr))
    errors.push("Minimum DSCR must be greater than zero.");
  if (!Number.isFinite(i.closingPct) || i.closingPct < 0 || i.closingPct > 0.2)
    errors.push("Closing costs must be between 0% and 20% of the new loan.");
  const empty: RefinanceResult = {
    errors,
    maxByLtv: 0,
    maxByDscr: 0,
    binding: "ltv",
    newLoan: 0,
    closingCosts: 0,
    cashOut: 0,
    currentPayment: 0,
    newPayment: 0,
    paymentChange: 0,
    currentDscr: null,
    newDscr: null,
    breakEvenMonths: null,
  };
  if (errors.length) return empty;
  const months = i.newYears * 12;
  const maxByLtv = i.value * i.maxLtv;
  // Largest loan whose payment keeps NOI at the minimum coverage.
  const perDollar = payment(1, i.newRate, months);
  const maxByDscr =
    i.noi > 0 && perDollar > 0 ? i.noi / i.minDscr / 12 / perDollar : 0;
  const binding = maxByLtv <= maxByDscr ? "ltv" : "dscr";
  const newLoan = Math.max(0, Math.min(maxByLtv, maxByDscr));
  const closingCosts = newLoan * i.closingPct;
  const currentPayment = payment(
    i.balance,
    i.currentRate,
    i.currentYearsLeft * 12,
  );
  const newPayment = payment(newLoan, i.newRate, months);
  const paymentChange = newPayment - currentPayment;
  return {
    errors,
    maxByLtv,
    maxByDscr,
    binding,
    newLoan,
    closingCosts,
    cashOut: newLoan - i.balance - closingCosts,
    currentPayment,
    newPayment,
    paymentChange,
    currentDscr: currentPayment > 0 ? i.noi / (12 * currentPayment) : null,
    newDscr: newPayment > 0 ? i.noi / (12 * newPayment) : null,
    breakEvenMonths: paymentChange < 0 ? closingCosts / -paymentChange : null,
  };
}

export type SellHoldInput = {
  value: number; // sale price today
  balance: number; // loan payoff today
  sellingCosts: number; // share of the sale price, decimal
  holdYears: number; // 3 to 10
  discountRate: number; // your target return, decimal
};
export type SellHoldResult = {
  errors: string[];
  /** Cash in hand if you sell today, after selling costs and loan payoff. */
  sellNowNet: number;
  /** Cash flows of keeping the property, years 1 to holdYears (sale in the last). */
  holdFlows: number[];
  /** Present value of those flows at the discount rate. */
  holdPresentValue: number | null;
  /** Hold minus sell-now in today's dollars; positive favors holding. */
  advantage: number | null;
  /** Return you earn on today's equity by not selling. */
  holdIrr: number | null;
  /** Total cash back from holding divided by today's equity. */
  holdMultiple: number | null;
  /**
   * Exit cap at which holding and selling are worth the same today; null when
   * the answer lies outside 2% to 25%. `holdWinsAtAnyCap` says which side.
   */
  breakEvenExitCap: number | null;
  holdWinsAtAnyCap: boolean | null;
};

function holdFlowsAt(a: Assumptions, years: number, exitCap?: number) {
  const m = calculate({
    ...a,
    hold: years,
    ...(exitCap === undefined ? {} : { exitCapMode: "manual", exitCap }),
  });
  return m.flows ? m.flows.slice(1) : null;
}
const pv = (flows: number[], rate: number) =>
  flows.reduce((s, v, t) => s + v / (1 + rate) ** (t + 1), 0);

export function sellVsHold(a: Assumptions, i: SellHoldInput): SellHoldResult {
  const errors: string[] = [];
  if (!Number.isFinite(i.value) || i.value <= 0)
    errors.push("Value today must be greater than zero.");
  if (!Number.isFinite(i.balance) || i.balance < 0)
    errors.push("Loan balance cannot be negative.");
  if (
    !Number.isFinite(i.sellingCosts) ||
    i.sellingCosts < 0 ||
    i.sellingCosts >= 1
  )
    errors.push("Selling costs must be at least 0% and below 100%.");
  if (!Number.isInteger(i.holdYears) || i.holdYears < 3 || i.holdYears > 10)
    errors.push("Hold period must be a whole number from 3 to 10 years.");
  if (
    !Number.isFinite(i.discountRate) ||
    i.discountRate < 0 ||
    i.discountRate > 1
  )
    errors.push("Target return must be between 0% and 100%.");
  const none: SellHoldResult = {
    errors,
    sellNowNet: 0,
    holdFlows: [],
    holdPresentValue: null,
    advantage: null,
    holdIrr: null,
    holdMultiple: null,
    breakEvenExitCap: null,
    holdWinsAtAnyCap: null,
  };
  if (errors.length) return none;
  const sellNowNet = i.value * (1 - i.sellingCosts) - i.balance;
  const flows = holdFlowsAt(a, i.holdYears);
  if (!flows)
    return {
      ...none,
      sellNowNet,
      errors: [
        "The hold case is incomplete (financing or forward NOI). Fix the assumptions to compare.",
      ],
    };
  const holdPresentValue = pv(flows, i.discountRate);
  const ret = sellNowNet > 0 ? irr([-sellNowNet, ...flows]) : { value: null };
  const total = flows.reduce((s, v) => s + v, 0);
  // Present value falls as the exit cap rises: bisect for equality with selling.
  const at = (cap: number) => {
    const f = holdFlowsAt(a, i.holdYears, cap);
    return f ? pv(f, i.discountRate) : null;
  };
  const low = at(0.02),
    high = at(0.25);
  let breakEvenExitCap: number | null = null;
  let holdWinsAtAnyCap: boolean | null = null;
  if (low !== null && high !== null) {
    if (high >= sellNowNet) holdWinsAtAnyCap = true;
    else if (low <= sellNowNet) holdWinsAtAnyCap = false;
    else {
      let lo = 0.02,
        hi = 0.25;
      for (let k = 0; k < 50; k++) {
        const mid = (lo + hi) / 2;
        const v = at(mid);
        if (v === null) break;
        if (v > sellNowNet) lo = mid;
        else hi = mid;
      }
      breakEvenExitCap = (lo + hi) / 2;
    }
  }
  return {
    errors,
    sellNowNet,
    holdFlows: flows,
    holdPresentValue,
    advantage: holdPresentValue - sellNowNet,
    holdIrr: ret.value,
    holdMultiple: sellNowNet > 0 ? total / sellNowNet : null,
    breakEvenExitCap,
    holdWinsAtAnyCap,
  };
}
