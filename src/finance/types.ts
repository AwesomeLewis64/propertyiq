export const expenseKeys = [
  "taxes",
  "insurance",
  "repairs",
  "utilities",
  "payroll",
  "administration",
  "marketing",
  "other",
] as const;
export type ExpenseKey = (typeof expenseKeys)[number];
export type Assumptions = {
  origin?: import("../data/provenance").Origin;
  taxesGrowth?: number;
  insuranceGrowth?: number;
  inflation?: number;
  taxReassessment?: boolean;
  reassessmentRate?: number;
  exitCapMode?: "manual" | "spread";
  exitSpread?: number;
  requiredReturn?: number;
  minDscr?: number;
  minDebtYield?: number;
  criteria?: import("./criteria").Criteria;
  ioConvention?: "after-io" | "consumes-term";
  accrual?: "30/360" | "actual/360";
  startDate?: string;
  name: string;
  location: string;
  units: number;
  price: number;
  rent: number;
  otherIncome: number;
  mode: "manual" | "rentRoll";
  occupiedMonthlyRent: number;
  vacancy: number;
  creditLoss: number;
  concessions: number;
  rentGrowth: number;
  otherGrowth: number;
  expenseGrowth: number;
  expenses: Record<ExpenseKey, number>;
  managementMode: "percent" | "fixed";
  management: number;
  reserves: number;
  annualCapex: number;
  loanMode: "ltv" | "amount" | "constraints";
  ltv: number;
  loanAmount: number;
  rate: number;
  amortization: number;
  maturity: number;
  interestOnlyMonths: number;
  loanFee: number;
  closingCosts: number;
  initialCapex: number;
  hold: number;
  exitCap: number;
  sellingCosts: number;
};
export type DebtMonth = {
  month: number;
  opening: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
};
export type DebtYear = {
  year: number;
  opening: number;
  service: number;
  interest: number;
  principal: number;
  balance: number;
  balloon: number;
};
export type Projection = {
  year: number;
  grossRent: number;
  vacancyLoss: number;
  creditLoss: number;
  concessions: number;
  otherIncome: number;
  egi: number;
  expenses: Record<ExpenseKey, number>;
  management: number;
  opex: number;
  noi: number;
  reserves: number;
  capex: number;
  debt: DebtYear | null;
  operatingCash: number | null;
  equityCash: number | null;
  dscr: number | null;
  debtYield: number | null;
};
export type Model = {
  bindingConstraint?: string;
  loanLimits?: { ltv: number; dscr: number; debtYield: number };
  effectiveExitCap?: number;
  errors: string[];
  warnings: string[];
  loan: number;
  initialEquity: number;
  monthlyPayment: number;
  months: DebtMonth[];
  years: Projection[];
  forwardNOI: number;
  grossExit: number;
  netSale: number | null;
  flows: number[] | null;
  irr: number | null;
  irrReason: string | null;
  multiple: number | null;
  invested: number | null;
  distributions: number | null;
  averageCoc: number | null;
  gain: number;
  refinanceRequired: boolean;
};
