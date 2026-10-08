import { debtSchedule } from "./debt";
import { irr } from "./irr";
import {
  expenseKeys,
  type Assumptions,
  type Model,
  type Projection,
} from "./types";
export function validate(a: Assumptions): string[] {
  const errors: string[] = [];
  const numbers = Object.entries(a).filter(
    ([, v]) => typeof v === "number",
  ) as [string, number][];
  for (const [key, v] of numbers)
    if (!Number.isFinite(v)) errors.push(`${key}: enter a finite number.`);
    else if (Math.abs(v) > 1e12)
      errors.push(`${key}: maximum supported value is 1 trillion.`);
  for (const key of [
    "units",
    "price",
    "amortization",
    "maturity",
    "exitCap",
  ] as const)
    if (a[key] <= 0) errors.push(`${key} must be greater than zero.`);
  if (!Number.isInteger(a.units) || a.units > 100000)
    errors.push("Units must be a whole number from 1 to 100,000.");
  if (![3, 4, 5].includes(a.hold))
    errors.push("Hold period must be 3, 4 or 5 years.");
  for (const key of [
    "rent",
    "otherIncome",
    "occupiedMonthlyRent",
    "reserves",
    "annualCapex",
    "loanAmount",
    "closingCosts",
    "initialCapex",
    "management",
  ] as const)
    if (a[key] < 0) errors.push(`${key} cannot be negative.`);
  for (const key of [
    "vacancy",
    "creditLoss",
    "concessions",
    "ltv",
    "sellingCosts",
    "loanFee",
    "rate",
  ] as const)
    if (a[key] < 0 || a[key] > 1)
      errors.push(`${key} must be between 0% and 100%.`);
  if (a.managementMode === "percent" && a.management > 1)
    errors.push("Management percentage must be between 0% and 100%.");
  if ((a.mode === "manual" ? a.vacancy : 0) + a.creditLoss + a.concessions > 1)
    errors.push(
      "Combined vacancy, credit loss and concessions cannot exceed 100%.",
    );
  for (const key of ["rentGrowth", "otherGrowth", "expenseGrowth"] as const)
    if (a[key] < -1 || a[key] > 1)
      errors.push(`${key} must be between -100% and 100%.`);
  for (const key of expenseKeys)
    if (
      !Number.isFinite(a.expenses[key]) ||
      a.expenses[key] < 0 ||
      a.expenses[key] > 1e12
    )
      errors.push(
        `${key}: enter an annual expense between zero and 1 trillion.`,
      );
  if (
    !Number.isInteger(a.amortization) ||
    !Number.isInteger(a.maturity) ||
    a.amortization > 50 ||
    a.maturity > 50
  )
    errors.push("Loan terms must be whole years, at most 50.");
  if (
    !Number.isInteger(a.interestOnlyMonths) ||
    a.interestOnlyMonths < 0 ||
    a.interestOnlyMonths >= a.amortization * 12
  )
    errors.push(
      "Interest-only months must be a whole number below the amortization term.",
    );
  if (a.interestOnlyMonths > a.maturity * 12)
    errors.push("Interest-only period cannot exceed maturity.");
  const loan = a.loanMode === "ltv" ? a.price * a.ltv : a.loanAmount;
  if (loan > a.price)
    errors.push(
      "Loan amount cannot exceed the acquisition price in this model.",
    );
  const equity =
    a.price + a.closingCosts + a.initialCapex + loan * a.loanFee - loan;
  if (equity <= 0)
    errors.push(
      "Initial equity must be positive to calculate investment returns.",
    );
  if (a.exitCap > 1)
    errors.push("Exit capitalization rate cannot exceed 100%.");
  return errors;
}
export function operating(a: Assumptions, year: number) {
  const grossRent =
    (a.mode === "rentRoll" ? a.occupiedMonthlyRent : a.units * a.rent) *
    12 *
    (1 + a.rentGrowth) ** (year - 1);
  const vacancyLoss = a.mode === "rentRoll" ? 0 : grossRent * a.vacancy;
  const creditLoss = grossRent * a.creditLoss,
    concessions = grossRent * a.concessions;
  const otherIncome = a.otherIncome * 12 * (1 + a.otherGrowth) ** (year - 1);
  const egi = grossRent - vacancyLoss - creditLoss - concessions + otherIncome;
  const expenses = Object.fromEntries(
    expenseKeys.map((k) => [
      k,
      a.expenses[k] * (1 + a.expenseGrowth) ** (year - 1),
    ]),
  ) as Assumptions["expenses"];
  const management =
    a.managementMode === "percent"
      ? egi * a.management
      : a.management * (1 + a.expenseGrowth) ** (year - 1);
  const opex = Object.values(expenses).reduce((s, v) => s + v, 0) + management;
  return {
    grossRent,
    vacancyLoss,
    creditLoss,
    concessions,
    otherIncome,
    egi,
    expenses,
    management,
    opex,
    noi: egi - opex,
  };
}
export function calculate(a: Assumptions): Model {
  const errors = validate(a);
  const empty: Model = {
    errors,
    warnings: [],
    loan: 0,
    initialEquity: 0,
    monthlyPayment: 0,
    months: [],
    years: [],
    forwardNOI: 0,
    grossExit: 0,
    netSale: null,
    flows: null,
    irr: null,
    irrReason: null,
    multiple: null,
    invested: null,
    distributions: null,
    averageCoc: null,
    gain: 0,
    refinanceRequired: false,
  };
  if (errors.length) return empty;
  const loan = a.loanMode === "ltv" ? a.price * a.ltv : a.loanAmount;
  const initialEquity =
    a.price + a.closingCosts + a.initialCapex + loan * a.loanFee - loan;
  const schedule = debtSchedule(
    loan,
    a.rate,
    a.amortization,
    a.maturity,
    a.interestOnlyMonths,
    a.hold,
  );
  const refinanceRequired =
    loan > 0 &&
    a.maturity < a.hold &&
    (schedule.months.at(-1)?.balance ?? 0) > 0;
  const warnings: string[] = [];
  if (refinanceRequired)
    warnings.push(
      `Loan matures in Year ${a.maturity}, before exit. Refinancing is not modeled. Equity cash flows at and after maturity, net sale proceeds and investment returns are unavailable. The balloon due appears in the debt schedule.`,
    );
  const years: Projection[] = Array.from({ length: 5 }, (_, i) => {
    const year = i + 1,
      op = operating(a, year);
    const debt = schedule.years.find((y) => y.year === year) ?? null;
    const reserves = a.reserves * a.units,
      capex = a.annualCapex;
    const operatingCash =
      debt && !(refinanceRequired && year >= a.maturity)
        ? op.noi - debt.service - reserves - capex
        : null;
    return {
      year,
      ...op,
      reserves,
      capex,
      debt,
      operatingCash,
      equityCash: year <= a.hold ? operatingCash : null,
      dscr: debt && debt.service > 0 ? op.noi / debt.service : null,
      debtYield: debt && debt.opening > 0 ? op.noi / debt.opening : null,
    };
  });
  const forwardNOI = operating(a, a.hold + 1).noi;
  const grossExit = forwardNOI / a.exitCap;
  if (!Number.isFinite(grossExit))
    return {
      ...empty,
      errors: [
        "Exit valuation exceeds the supported numerical range. Increase the exit cap rate or reduce income assumptions.",
      ],
    };
  if (forwardNOI <= 0)
    warnings.push(
      "Forward NOI is nonpositive; capitalization-based exit value and investment returns are unavailable.",
    );
  const exitBalance = years[a.hold - 1].debt?.balance;
  const netSale =
    !refinanceRequired && forwardNOI > 0 && exitBalance !== undefined
      ? grossExit * (1 - a.sellingCosts) - exitBalance
      : null;
  if (netSale !== null && years[a.hold - 1].equityCash !== null)
    years[a.hold - 1].equityCash! += netSale;
  const complete =
    netSale !== null &&
    years.slice(0, a.hold).every((y) => y.equityCash !== null);
  const flows = complete
    ? [-initialEquity, ...years.slice(0, a.hold).map((y) => y.equityCash!)]
    : null;
  const result = flows
    ? irr(flows)
    : {
        value: null,
        reason: "Complete financing and a positive forward NOI are required.",
      };
  // Negative annual cash flows are additional contributions, never distributions.
  const invested = flows
    ? -flows.filter((v) => v < 0).reduce((s, v) => s + v, 0)
    : null;
  const distributions = flows
    ? flows.filter((v) => v > 0).reduce((s, v) => s + v, 0)
    : null;
  return {
    errors,
    warnings,
    loan,
    initialEquity,
    monthlyPayment: schedule.monthlyPayment,
    months: schedule.months,
    years,
    forwardNOI,
    grossExit,
    netSale,
    flows,
    irr: result.value,
    irrReason: result.reason,
    multiple:
      invested && distributions !== null ? distributions / invested : null,
    invested,
    distributions,
    averageCoc: complete
      ? years.slice(0, a.hold).reduce((s, y) => s + y.operatingCash!, 0) /
        a.hold /
        initialEquity
      : null,
    gain: grossExit * (1 - a.sellingCosts) - a.price,
    refinanceRequired,
  };
}
