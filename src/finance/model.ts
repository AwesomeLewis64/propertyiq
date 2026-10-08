import { debtSchedule, payment } from "./debt";
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
  if (!Number.isInteger(a.hold) || a.hold < 3 || a.hold > 10)
    errors.push("Hold period must be a whole number from 3 to 10 years.");
  for (const key of ["taxesGrowth", "insuranceGrowth", "inflation"] as const)
    if (a[key] !== undefined && (a[key]! < -1 || a[key]! > 1))
      errors.push(`${key} must be between -100% and 100%.`);
  for (const key of [
    "exitSpread",
    "requiredReturn",
    "reassessmentRate",
    "minDebtYield",
  ] as const)
    if (a[key] !== undefined && (a[key]! < 0 || a[key]! > 1))
      errors.push(`${key} must be between 0% and 100%.`);
  if (a.minDscr !== undefined && a.minDscr <= 0)
    errors.push("Minimum DSCR must be positive.");
  if (a.loanMode === "constraints" && (a.minDebtYield ?? 0.08) <= 0)
    errors.push("Minimum debt yield must be positive.");
  if (
    a.startDate !== undefined &&
    (!/^\d{4}-\d{2}-01$/.test(a.startDate) ||
      !Number.isFinite(Date.parse(a.startDate)))
  )
    errors.push("Debt start date must be the first day of a valid month.");
  if (
    a.ioConvention !== undefined &&
    !["after-io", "consumes-term"].includes(a.ioConvention)
  )
    errors.push("Unknown IO convention.");
  if (a.accrual !== undefined && !["30/360", "actual/360"].includes(a.accrual))
    errors.push("Unknown interest accrual.");
  if (
    a.exitCapMode !== undefined &&
    !["manual", "spread"].includes(a.exitCapMode)
  )
    errors.push("Unknown exit cap method.");
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
    (a.ioConvention === "consumes-term" &&
      a.interestOnlyMonths >= a.amortization * 12)
  )
    errors.push(
      "Interest-only months must be a nonnegative whole number; original-term IO must be shorter than amortization.",
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
      a.expenses[k] *
        (1 +
          (k === "taxes"
            ? (a.taxesGrowth ?? a.expenseGrowth)
            : k === "insurance"
              ? (a.insuranceGrowth ?? a.expenseGrowth)
              : a.expenseGrowth)) **
          (year - 1),
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
  const amortYears =
    debtSchedule(1, a.rate, a.amortization, a.maturity, 0, 1, a).years[0]
      ?.service ?? payment(1, a.rate, a.amortization * 12) * 12;
  const loanLimits = {
    ltv: a.price * a.ltv,
    dscr: Math.max(0, operating(a, 1).noi) / (a.minDscr ?? 1.25) / amortYears,
    debtYield: Math.max(0, operating(a, 1).noi) / (a.minDebtYield ?? 0.08),
  };
  const bindingConstraint =
    a.loanMode === "constraints"
      ? Object.entries(loanLimits).sort((x, y) => x[1] - y[1])[0][0]
      : a.loanMode;
  const loan =
    a.loanMode === "amount"
      ? a.loanAmount
      : a.loanMode === "constraints"
        ? Math.min(...Object.values(loanLimits))
        : loanLimits.ltv;
  const initialEquity =
    a.price + a.closingCosts + a.initialCapex + loan * a.loanFee - loan;
  const schedule = debtSchedule(
    loan,
    a.rate,
    a.amortization,
    a.maturity,
    a.interestOnlyMonths,
    a.hold,
    a,
  );
  const refinanceRequired =
    loan > 0 &&
    a.maturity < a.hold &&
    (schedule.months.at(-1)?.balance ?? 0) > 0;
  const warnings: string[] = [];
  const effectiveExitCap =
    a.exitCapMode === "spread"
      ? operating(a, 1).noi / a.price + (a.exitSpread ?? 0.00625)
      : a.exitCap;
  if (effectiveExitCap <= 0 || effectiveExitCap > 1)
    return {
      ...empty,
      errors: [
        "Derived exit cap must be greater than zero and no more than 100%.",
      ],
    };
  if (effectiveExitCap < operating(a, 1).noi / a.price)
    warnings.push(
      "Exit cap is below the going-in cap: this assumes cap-rate compression and increases the projected sale value.",
    );
  if (refinanceRequired)
    warnings.push(
      `Loan matures in Year ${a.maturity}, before exit. Refinancing is not modeled. Equity cash flows at and after maturity, net sale proceeds and investment returns are unavailable. The balloon due appears in the debt schedule.`,
    );
  const years: Projection[] = Array.from(
    { length: Math.max(5, a.hold) },
    (_, i) => {
      const year = i + 1,
        op = operating(a, year);
      const debt = schedule.years.find((y) => y.year === year) ?? null;
      const reserves = a.reserves * a.units * (1 + (a.inflation ?? 0)) ** i,
        capex = a.annualCapex * (1 + (a.inflation ?? 0)) ** i;
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
    },
  );
  let forwardNOI = operating(a, a.hold + 1).noi;
  let grossExit = forwardNOI / effectiveExitCap;
  if (a.taxReassessment) {
    const forwardTaxes = operating(a, a.hold + 1).expenses.taxes;
    grossExit =
      (forwardNOI + forwardTaxes) /
      (effectiveExitCap + (a.reassessmentRate ?? 0.02));
    forwardNOI = grossExit * effectiveExitCap;
    warnings.push(
      "Exit valuation replaces forward property taxes with the entered effective tax rate times sale value. This is a scenario assumption, not a jurisdiction-specific tax estimate.",
    );
  }
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
    bindingConstraint,
    loanLimits,
    effectiveExitCap,
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
