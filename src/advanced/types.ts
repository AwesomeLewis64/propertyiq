export type Strategy =
  | "acquisition"
  | "existing"
  | "development-sale"
  | "development-hold";
export type Unit = {
  id: string;
  occupied: boolean;
  rent: number;
  marketRent: number;
  availableMonth: number;
  leaseEnd: number;
  renewal: "renew" | "vacate";
  renewalIncrease: number;
  turnoverMonths: number;
  renovationMonth: number;
  renovationMonths: number;
  renovationCost: number;
  renovatedRent: number;
  targetMonth: number;
  targetRent: number;
  concession: number;
  concessionMonths: number;
  saleMonth: number;
  salePrice: number;
  renovationEnabled?: boolean;
  events?: LeaseEvent[];
};
export type LeaseEvent = {
  id: string;
  month: number;
  kind: "rent" | "lease" | "vacant" | "concession";
  amount: number;
  duration: number;
  note: string;
};
export type Expense = {
  id: string;
  name: string;
  annual: number;
  growth: number;
  startMonth: number;
  changeMonth: number;
  replacementAnnual: number;
  reimbursement: number;
};
export type Budget = {
  id: string;
  name: string;
  category: "hard" | "soft" | "other";
  amount: number;
  start: number;
  duration: number;
  debtEligible: boolean;
};
export type RatePoint = { month: number; annual: number };
export type Loan = {
  ioConvention?: "after-io" | "consumes-term";
  accrual?: "30/360" | "actual/360";
  id: string;
  name: string;
  kind: "term" | "construction";
  amount: number;
  fundingMonth: number;
  rate: number;
  floating: boolean;
  rateCap: number;
  rateCapExpiry?: number;
  ratePoints: RatePoint[];
  amortMonths: number;
  ioMonths: number;
  maturityMonth: number;
  fee: number;
  penalty: number;
  ltc: number;
  capitalizeInterest: boolean;
  releasePercent: number;
  refiMonth: number;
  refiAmount: number;
  refiLtv: number;
  refiRate: number;
  refiAmort: number;
  refiIo: number;
  refiFee: number;
  refiMaturity: number;
};
export type Actual = {
  month: string;
  rent: number;
  otherIncome: number;
  opex: number;
  capex: number;
  debtService: number;
};
export type HistoricalFlow = { date: string; amount: number; note: string };
export type Partner = { id: string; name: string; share: number };
export type Evidence = {
  id: string;
  type:
    | "rent comp"
    | "sale comp"
    | "bid"
    | "inspection"
    | "title"
    | "zoning"
    | "approval"
    | "other";
  title: string;
  source: string;
  date: string;
  status: "unverified" | "reviewed" | "confirmed";
  value: number;
  note: string;
  attachmentId?: string;
};
export type DiligenceTask = {
  id: string;
  title: string;
  owner: string;
  due: string;
  status: "open" | "in progress" | "complete";
  note: string;
};
export type Project = {
  origin?: import("../data/provenance").Origin;
  growthTiming?: "annual" | "monthly";
  vacancyRate?: number;
  concessionRate?: number;
  additiveLosses?: boolean;
  otherGrowth?: number;
  inflation?: number;
  annualCapex?: number;
  fixedManagement?: number;
  fixedManagementGrowth?: number;
  taxReassessment?: boolean;
  reassessmentRate?: number;
  tools?: import("./toolSchema").DecisionTools;
  id: string;
  name: string;
  location: string;
  strategy: Strategy;
  startDate: string;
  acquisitionDate: string;
  months: number;
  price: number;
  closing: number;
  initialCapex: number;
  openingCash: number;
  minimumCash: number;
  distribute: boolean;
  asOfEquity: number;
  rentGrowth: number;
  creditLoss: number;
  otherMonthly: number;
  management: number;
  reservesMonthly: number;
  contingency: number;
  exitCap: number;
  sellingCost: number;
  discount: number;
  sellAtEnd: boolean;
  units: Unit[];
  expenses: Expense[];
  budget: Budget[];
  loans: Loan[];
  actuals: Actual[];
  historical: HistoricalFlow[];
  partners: Partner[];
  evidence: Evidence[];
  tasks: DiligenceTask[];
  lender: {
    minDscr: number;
    maxLtv: number;
    minYield: number;
    value: number;
    periodStart: number;
    reserveAnnual: number;
    adjustmentAnnual: number;
    stressRate: number;
    amortMonths: number;
    useIO: boolean;
  };
  tax: {
    enabled: boolean;
    ordinaryRate: number;
    capitalRate: number;
    recaptureRate: number;
    depreciableBasis: number;
    annualDepreciation: number;
    saleBasis: number;
    lossOffset: boolean;
  };
  waterfall: {
    enabled: boolean;
    preferred: number;
    sponsorId: string;
    promote: number;
    returnCapitalFirst: boolean;
  };
  risk: {
    trials: number;
    seed: number;
    rentLow: number;
    rentHigh: number;
    capLow: number;
    capHigh: number;
    costLow: number;
    costHigh: number;
    delayMax: number;
    correlation: number;
  };
};
export type Monthly = {
  saleNetProceeds?: number | null;
  month: number;
  date: string;
  occupied: number;
  rent: number;
  vacancy: number;
  concessions: number;
  creditLoss: number;
  other: number;
  expenses: number;
  noi: number;
  lenderNcf: number;
  capex: number;
  reserves: number;
  debtService: number;
  interest: number;
  balance: number;
  draws: number;
  refinance: number;
  payoffs: number;
  fees: number;
  sales: number;
  netSale: number;
  cashBefore: number;
  capitalCall: number;
  distribution: number;
  cash: number;
  equityFlow: number;
  tax: number;
  afterTaxFlow: number;
  actual: boolean;
  blocked: boolean;
};
export type DebtRecord = {
  month: number;
  loan: string;
  opening: number;
  draw: number;
  rate: number;
  interest: number;
  capitalized: number;
  service: number;
  principal: number;
  payoff: number;
  fee: number;
  balance: number;
  refinance: number;
};
export type DatedFlow = { date: string; amount: number };
export type Forecast = {
  errors: string[];
  warnings: string[];
  rows: Monthly[];
  debt: DebtRecord[];
  initialEquity: number;
  flows: DatedFlow[];
  irr: number | null;
  irrReason: string | null;
  npv: number | null;
  multiple: number | null;
  afterTaxIrr: number | null;
  inceptionIrr: number | null;
  additionalEquity: number;
  lowestUnfundedCash: number;
  grossExit: number | null;
  totalProfit: number;
  sizing: {
    ncf: number;
    annualServicePerDollar: number;
    dscrLoan: number;
    ltvLoan: number;
    yieldLoan: number;
    maximum: number;
    binding: string;
    reduction: number;
    extraEquity: number;
    coverage: number | null;
  };
  partners: {
    id: string;
    name: string;
    contributed: number;
    distributed: number;
    endingCapital: number;
    unpaidPref: number;
    irr: number | null;
    multiple: number | null;
  }[];
};
