export const metricLabels = {
  noi: "Period NOI",
  debt: "Period scheduled debt service",
  dscr: "Period NOI DSCR",
  equity: "Initial / as-of equity",
  funding: "Additional owner capital calls",
  irr: "Forecast dated XIRR",
  npv: "Forecast NPV",
  multiple: "Equity multiple",
  exit: "Gross rental exit value",
} as const;
export type MetricKey = keyof typeof metricLabels;
export type Scenario = {
  rent: number;
  cost: number;
  delay: number;
  cap: number;
  rateShock: number;
  refiDelay: number;
  refiProceeds: number;
  capExpiry: number;
};
export type Benchmark = {
  id: string;
  metric: MetricKey;
  value: number;
  source: string;
  locator: string;
  definition: string;
  attachmentId: string;
  evidenceId: string;
};
export type SourceLink = {
  metric: MetricKey;
  evidenceId: string;
  note: string;
  reviewed: string;
};
export type Offer = {
  id: string;
  name: string;
  amount: number;
  rate: number;
  amort: number;
  io: number;
  maturity: number;
  fee: number;
  penalty: number;
  reserve: number;
  source: string;
};
export type Detail = {
  id: string;
  month: string;
  kind: "rent" | "otherIncome" | "expense";
  unit: string;
  category: string;
  amount: number;
  source: string;
};
export type Decision = {
  id: string;
  date: string;
  kind: "decision" | "milestone";
  title: string;
  status: "pending" | "pursue" | "pass" | "complete";
  owner: string;
  due: string;
  rationale: string;
  outcome: string;
  evidenceId: string;
};
export type CaseRow = {
  id: string;
  label: string;
  acquisition: number | null;
  actual: number | null;
  forecast: number | null;
  unit: "money" | "percent" | "number";
  source: string;
  date: string;
  verified: boolean;
  note: string;
};
export type Deposit = {
  id: string;
  unit: string;
  month: number;
  amount: number;
  refundMonth: number;
  note: string;
};
export type DecisionTools = {
  scenarios: { downside: Scenario; upside: Scenario };
  reconciliation: {
    start: number;
    length: number;
    tolerance: number;
    benchmarks: Benchmark[];
  };
  renovation: {
    budget: number;
    monthly: number;
    first: number;
    simultaneous: number;
  };
  offers: Offer[];
  details: Detail[];
  sources: SourceLink[];
  decisions: Decision[];
  caseStudy: {
    title: string;
    audience: "internal" | "public";
    narrative: string;
    rows: CaseRow[];
  };
  absorption: {
    start: number;
    pace: number;
    priceGrowth: number;
    commission: number;
    basePrices: Record<string, number>;
    cancelled: string[];
    deposits: Deposit[];
  };
  quality: {
    insurancePerUnit: number;
    maxCompPremium: number;
    occupancyTarget: number;
    minDscr: number;
  };
  // Optional and absent from newTools(): old saved projects have no criteria.
  criteria?: import("../finance/criteria").Criteria;
};
export const baseScenario = (): Scenario => ({
  rent: 1,
  cost: 1,
  delay: 0,
  cap: 0,
  rateShock: 0,
  refiDelay: 0,
  refiProceeds: 1,
  capExpiry: 0,
});
export function newTools(): DecisionTools {
  return {
    scenarios: {
      downside: {
        ...baseScenario(),
        rent: 0.9,
        cost: 1.2,
        delay: 3,
        cap: 0.075,
        rateShock: 0.02,
        refiProceeds: 0.9,
      },
      upside: { ...baseScenario(), rent: 1.05, cost: 0.95, cap: 0.06 },
    },
    reconciliation: { start: 1, length: 12, tolerance: 0.01, benchmarks: [] },
    renovation: { budget: 100000, monthly: 20000, first: 1, simultaneous: 2 },
    offers: [],
    details: [],
    sources: [],
    decisions: [],
    caseStudy: {
      title: "Property case study",
      audience: "internal",
      narrative: "",
      rows: [
        {
          id: "price",
          label: "Purchase price",
          acquisition: null,
          actual: null,
          forecast: null,
          unit: "money",
          source: "",
          date: "",
          verified: false,
          note: "",
        },
        {
          id: "rent",
          label: "Monthly rent",
          acquisition: null,
          actual: null,
          forecast: null,
          unit: "money",
          source: "",
          date: "",
          verified: false,
          note: "",
        },
        {
          id: "noi",
          label: "Annual NOI",
          acquisition: null,
          actual: null,
          forecast: null,
          unit: "money",
          source: "",
          date: "",
          verified: false,
          note: "",
        },
        {
          id: "dscr",
          label: "DSCR",
          acquisition: null,
          actual: null,
          forecast: null,
          unit: "number",
          source: "",
          date: "",
          verified: false,
          note: "",
        },
      ],
    },
    absorption: {
      start: 20,
      pace: 2,
      priceGrowth: 0,
      commission: 0.025,
      basePrices: {},
      cancelled: [],
      deposits: [],
    },
    quality: {
      insurancePerUnit: 400,
      maxCompPremium: 0.1,
      occupancyTarget: 0.9,
      minDscr: 1.25,
    },
  };
}
// Version 2 backups remain readable: additions are optional on existing projects.
export function toolsFor(p: { tools?: DecisionTools }): DecisionTools {
  return p.tools ?? newTools();
}
export function validateTools(t: DecisionTools): string[] {
  const e: string[] = [];
  try {
    for (const s of Object.values(t.scenarios))
      if (
        s.rent < 0 ||
        s.cost < 0 ||
        !Number.isInteger(s.delay) ||
        s.delay < 0 ||
        s.delay > 120 ||
        s.cap < 0 ||
        s.cap > 1 ||
        s.rateShock < -0.99 ||
        s.rateShock > 1 ||
        !Number.isInteger(s.refiDelay) ||
        s.refiDelay < 0 ||
        s.refiDelay > 120 ||
        s.refiProceeds < 0 ||
        !Number.isInteger(s.capExpiry) ||
        s.capExpiry < 0 ||
        s.capExpiry > 240
      )
        e.push("Check scenario multipliers and whole-month delays.");
    if (
      !Number.isInteger(t.reconciliation.start) ||
      t.reconciliation.start < 1 ||
      !Number.isInteger(t.reconciliation.length) ||
      t.reconciliation.length < 1 ||
      t.reconciliation.length > 120 ||
      t.reconciliation.tolerance < 0
    )
      e.push("Check reconciliation period and tolerance.");
    for (const b of t.reconciliation.benchmarks)
      if (!(b.metric in metricLabels) || !Number.isFinite(b.value))
        e.push("Invalid reconciliation benchmark.");
    const r = t.renovation;
    if (
      r.budget < 0 ||
      r.monthly <= 0 ||
      ![r.first, r.simultaneous].every((v) => Number.isInteger(v) && v > 0)
    )
      e.push(
        "Use positive monthly renovation capacity and whole-month/unit limits.",
      );
    for (const q of t.offers)
      if (
        q.amount < 0 ||
        q.rate < 0 ||
        q.rate > 1 ||
        q.fee < 0 ||
        q.fee > 1 ||
        q.penalty < 0 ||
        q.penalty > 1 ||
        q.reserve < 0 ||
        ![q.amort, q.maturity].every((v) => Number.isInteger(v) && v > 0) ||
        !Number.isInteger(q.io) ||
        q.io < 0 ||
        q.io >= q.amort
      )
        e.push("Invalid lender comparison offer.");
    for (const d of t.details)
      if (
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(d.month) ||
        !["rent", "otherIncome", "expense"].includes(d.kind) ||
        d.amount < 0
      )
        e.push(
          "Operating detail needs valid YYYY-MM dates and positive gross amounts.",
        );
    const a = t.absorption;
    if (
      !Number.isInteger(a.start) ||
      a.start < 1 ||
      !Number.isInteger(a.pace) ||
      a.pace < 1 ||
      a.priceGrowth <= -1 ||
      a.priceGrowth > 1 ||
      a.commission < 0 ||
      a.commission > 1
    )
      e.push(
        "Check absorption start, whole-unit pace, price growth and selling cost.",
      );
    if (
      Object.values(a.basePrices).some(
        (v) => typeof v !== "number" || !Number.isFinite(v) || v < 0,
      )
    )
      e.push("Use nonnegative numeric base sale prices.");
    for (const d of a.deposits)
      if (
        !Number.isInteger(d.month) ||
        d.month < 1 ||
        d.amount < 0 ||
        !Number.isInteger(d.refundMonth) ||
        d.refundMonth < 0 ||
        (d.refundMonth > 0 && d.refundMonth < d.month)
      )
        e.push("Check deposit amounts and refund timing.");
    if (
      t.quality.insurancePerUnit < 0 ||
      t.quality.maxCompPremium < 0 ||
      t.quality.occupancyTarget <= 0 ||
      t.quality.occupancyTarget > 1 ||
      t.quality.minDscr <= 0
    )
      e.push("Check quality thresholds.");
    for (const rows of [
      t.offers,
      t.details,
      t.decisions,
      t.caseStudy.rows,
      t.reconciliation.benchmarks,
      t.absorption.deposits,
    ])
      if (rows.length > 5000)
        e.push("Decision data limit is 5,000 rows per collection.");
    if (
      t.caseStudy.rows.some(
        (r) => !["money", "percent", "number"].includes(r.unit),
      )
    )
      e.push("Invalid case-study value format.");
  } catch {
    e.push("Decision-tool data is malformed.");
  }
  return [...new Set(e)];
}
