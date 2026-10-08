import { demo } from "./demo";
import { calculate } from "./model";
import { expenseKeys, type Assumptions } from "./types";
import { newProject, newUnit, newLoan } from "../advanced/defaults";
import type { Project } from "../advanced/types";

// The bridge preserves operating and debt conventions. It does not substitute
// the annual result for the monthly calculation: both engines still run independently.
export function monthlyFromAnnual(a: Assumptions): Project {
  const m = calculate(a);
  if (m.errors.length) throw new Error(m.errors.join(" "));
  const p = newProject();
  Object.assign(p, {
    id: "maple-grove-shared",
    name: a.name,
    location: a.location,
    startDate: a.startDate ?? "2026-10-01",
    acquisitionDate: a.startDate ?? "2026-10-01",
    months: a.hold * 12,
    price: a.price,
    closing: a.closingCosts,
    initialCapex: a.initialCapex,
    openingCash: 0,
    minimumCash: 0,
    distribute: true,
    growthTiming: "annual",
    additiveLosses: true,
    vacancyRate: a.mode === "rentRoll" ? 0 : a.vacancy,
    concessionRate: a.concessions,
    creditLoss: a.creditLoss,
    rentGrowth: a.rentGrowth,
    otherGrowth: a.otherGrowth,
    otherMonthly: a.otherIncome,
    management: a.managementMode === "percent" ? a.management : 0,
    fixedManagement: a.managementMode === "fixed" ? a.management : 0,
    fixedManagementGrowth: a.expenseGrowth,
    reservesMonthly: (a.reserves * a.units) / 12,
    annualCapex: a.annualCapex,
    inflation: a.inflation ?? 0,
    contingency: 0,
    exitCap: m.effectiveExitCap,
    sellingCost: a.sellingCosts,
    discount: a.requiredReturn ?? 0.1,
    taxReassessment: a.taxReassessment ?? false,
    reassessmentRate: a.reassessmentRate ?? 0.02,
    budget: [],
    actuals: [],
    historical: [],
    partners: [{ id: "owner", name: "Owner", share: 1 }],
  });
  p.units = Array.from({ length: a.units }, (_, i) => ({
    ...newUnit(i + 1),
    rent: a.mode === "rentRoll" ? a.occupiedMonthlyRent / a.units : a.rent,
    occupied: true,
    marketRent: a.rent,
    leaseEnd: 0,
    renewalIncrease: 0,
    renovationMonth: 0,
    renovationCost: 0,
    targetMonth: 0,
    saleMonth: 0,
  }));
  p.expenses = expenseKeys.map((k) => ({
    id: k,
    name: k === "taxes" ? "Taxes" : k,
    annual: a.expenses[k],
    growth:
      k === "taxes"
        ? (a.taxesGrowth ?? a.expenseGrowth)
        : k === "insurance"
          ? (a.insuranceGrowth ?? a.expenseGrowth)
          : a.expenseGrowth,
    startMonth: 1,
    changeMonth: 0,
    replacementAnnual: 0,
    reimbursement: 0,
  }));
  p.loans = m.loan
    ? [
        {
          ...newLoan(),
          id: "shared-senior",
          amount: m.loan,
          rate: a.rate,
          amortMonths: a.amortization * 12,
          maturityMonth: a.maturity * 12,
          ioMonths: a.interestOnlyMonths,
          fee: a.loanFee,
          ioConvention: a.ioConvention ?? "after-io",
          accrual: a.accrual ?? "30/360",
        },
      ]
    : [];
  p.waterfall.enabled = false;
  p.waterfall.sponsorId = "owner";
  p.tax.enabled = false;
  p.lender.periodStart = 1;
  p.lender.value = a.price;
  return p;
}
export const sharedSample = () => monthlyFromAnnual(structuredClone(demo));
export const sampleSummary = () => {
  const m = calculate(demo);
  return {
    name: demo.name,
    units: demo.units,
    rent: m.years[0].grossRent,
    expenses: m.years[0].opex,
    noi: m.years[0].noi,
  };
};
