import { newProject, newUnit, newLoan, uid } from "../advanced/defaults";
import type { Project } from "../advanced/types";
import { sharedSample } from "../finance/sharedSample";
import { freshAnalysis } from "../data/storage";
import type { Assumptions } from "../finance/types";

export type BriefNumbers = Partial<
  Record<
    | "units"
    | "rent"
    | "price"
    | "expenses"
    | "loan"
    | "rate"
    | "ltv"
    | "exitCap",
    number
  >
>;
const amount = "(\\$?\\s*\\d[\\d,]*(?:\\.\\d+)?\\s*(?:million|thousand|[km])?)";
function value(text: string): number {
  const normalized = text.toLowerCase().replace(/[$,\s]/g, "");
  const multiplier = /million$|m$/.test(normalized)
    ? 1e6
    : /thousand$|k$/.test(normalized)
      ? 1e3
      : 1;
  return Number(normalized.replace(/million|thousand|[km]$/g, "")) * multiplier;
}
function read(text: string, patterns: string[]): number | undefined {
  for (const pattern of patterns) {
    const found = text.match(new RegExp(pattern, "i"));
    if (found) {
      const n = value(found[1]);
      if (Number.isFinite(n) && n >= 0 && n <= 1e12) return n;
    }
  }
}
// Rotating composer hints. Each must extract cleanly (see phrasing.test.ts).
export const briefExamples = [
  "$2.8M purchase; 20 units at $1,900/mo; 6.25% rate; 65% LTV",
  "24 units for $3.1 million; rents are $1,100; annual expenses $120k",
  "12-unit building, asking price $1.45M, monthly rent of $18,600, 7% interest",
  "36 apartments priced at $5.2M; $612k annual rent; annual operating expenses of $210k",
  "8 units at $1,450/mo; buy for $980k; $650k loan at a 6.5% rate",
  "16 units for $2.2M; $19,200 monthly rent; 6% exit cap",
];
// Deliberately limited matching. Numbers are suggestions and always reviewed before creation.
export function extractBrief(text: string): BriefNumbers {
  const unitMatch = text.match(/\b(\d+)\s*[- ]?\s*(?:units?\b|apartments?\b)/i);
  const monthlyRent = read(text, [
    `${amount}\\s*(?:in\\s+)?(?:monthly|per month)\\s*(?:rental income|rent|income)`,
    `(?:monthly rent|monthly rental income|rent per month)\\s*(?:of|is|:|=)?\\s*${amount}`,
    `${amount}\\s*(?:rent|rental income)\\s*(?:per month|monthly|/mo)`,
  ]);
  const annualRent = read(text, [
    `(?:annual rent|annual rental income)\\s*(?:of|is|:|=)?\\s*${amount}`,
    `${amount}\\s*(?:in\\s+)?annual\\s*(?:rent|rental income)`,
  ]);
  const annualExpenses = read(text, [
    `(?:annual expenses|annual operating expenses|annual operating costs)\\s*(?:of|is|:|=)?\\s*${amount}`,
    `${amount}\\s*(?:in\\s+)?annual\\s*(?:operating\\s+)?(?:expenses|costs)`,
  ]);
  const monthlyExpenses = read(text, [
    `(?:monthly expenses|monthly operating expenses)\\s*(?:of|is|:|=)?\\s*${amount}`,
  ]);
  const result: BriefNumbers = {};
  const perUnit = read(text, [
    `units?\\s+at\\s*${amount}\\s*(?:/mo|per month|monthly)`,
    `(?:rents? are|rent per unit|per-unit rent)\\s*(?:is|of|:|=)?\\s*${amount}`,
  ]);
  const put = (key: keyof BriefNumbers, n: number | undefined) => {
    if (n !== undefined) result[key] = n;
  };
  put("units", unitMatch ? Number(unitMatch[1]) : undefined);
  put(
    "rent",
    monthlyRent ??
      (annualRent === undefined
        ? perUnit !== undefined && unitMatch
          ? perUnit * Number(unitMatch[1])
          : undefined
        : annualRent / 12),
  );
  put(
    "expenses",
    annualExpenses ??
      (monthlyExpenses === undefined ? undefined : monthlyExpenses * 12),
  );
  put(
    "price",
    read(text, [
      `(?:purchase price|asking price|price|buy for|priced at)\\s*(?:of|is|:|=)?\\s*${amount}`,
      `${amount}\\s*(?:purchase price|asking price)`,
      `${amount}\\s*purchase\\b`,
      `\\bfor\\s*${amount}`,
    ]),
  );
  put(
    "loan",
    read(text, [
      `(?:loan amount|loan of|debt of|mortgage of)\\s*(?:is|:|=)?\\s*${amount}`,
      `${amount}\\s*(?:loan|mortgage)`,
    ]),
  );
  const rate =
    text.match(
      /(?:interest rate|loan rate|mortgage rate)\s*(?:of|is|:|=)?\s*(\d+(?:\.\d+)?)\s*%/i,
    ) ?? text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:interest|loan rate|rate)/i);
  put("rate", rate ? Number(rate[1]) : undefined);
  const ltv = text.match(/(\d+(?:\.\d+)?)\s*%\s*LTV\b/i);
  if (ltv && Number(ltv[1]) <= 100) {
    result.ltv = Number(ltv[1]);
    if (result.loan === undefined && result.price !== undefined)
      result.loan = (result.price * result.ltv) / 100;
  }
  const cap =
    text.match(
      /(?:exit cap\s*(?:of|is|:|=)?\s*)?(\d+(?:\.\d+)?)\s*%?\s*(?:cap\b|exit cap\b)/i,
    ) ?? text.match(/exit cap\s*(?:of|is|:|=)?\s*(\d+(?:\.\d+)?)\s*%/i);
  if (cap && Number(cap[1]) > 0 && Number(cap[1]) <= 100)
    result.exitCap = Number(cap[1]);
  if (result.rate !== undefined && result.rate > 100) delete result.rate;
  if (result.units !== undefined && (result.units < 1 || result.units > 500))
    delete result.units;
  return result;
}
export type SetupValues = {
  name: string;
  location: string;
  strategy: Project["strategy"];
  units: string;
  rent: string;
  price: string;
  expenses: string;
  loan: string;
  rate: string;
  start: string;
  equity: string;
  exitCap?: string;
  sellingCosts?: string;
  requiredReturn?: string;
  amortization?: string;
  maturity?: string;
  hold?: string;
  // Blank means 0. These move returns most (annual path only).
  vacancy?: string;
  management?: string;
  annualCapex?: string;
};
export type WorkspaceLaunch = {
  project?: Project;
  tab?: "overview" | "imports" | "monthly" | "decisionlab" | "report";
  file?: File;
  decision?: "lenders" | "breakeven";
};
export function setupAnnual(v: SetupValues): Assumptions {
  return {
    ...freshAnalysis(),
    name: v.name || "Untitled property",
    location: v.location,
    units: Number(v.units),
    rent: Number(v.rent || 0) / Number(v.units),
    price: Number(v.price || 0),
    loanMode: "amount",
    loanAmount: Number(v.loan || 0),
    rate: Number(v.rate || 0) / 100,
    loanFee: 0,
    vacancy: Number(v.vacancy || 0) / 100,
    concessions: 0,
    creditLoss: 0,
    management: Number(v.management || 0) / 100,
    annualCapex: Number(v.annualCapex || 0),
    rentGrowth: 0,
    otherGrowth: 0,
    expenseGrowth: 0,
    taxesGrowth: 0,
    insuranceGrowth: 0,
    expenses: {
      taxes: 0,
      insurance: 0,
      repairs: 0,
      utilities: 0,
      payroll: 0,
      administration: 0,
      marketing: 0,
      other: Number(v.expenses || 0),
    },
    hold: Number(v.hold ?? 5),
    amortization: Number(v.amortization ?? 30),
    maturity: Number(v.maturity ?? 10),
    startDate: v.start + "-01",
    exitCapMode: v.exitCap ? "manual" : "spread",
    exitCap: v.exitCap ? Number(v.exitCap) / 100 : 0.001,
    sellingCosts: Number(v.sellingCosts ?? 2.5) / 100,
    requiredReturn: Number(v.requiredReturn ?? 10) / 100,
  };
}

export function setupProject(v: SetupValues, description: string): Project {
  const p = newProject(v.strategy);
  p.origin = "user";
  const dev = v.strategy.startsWith("development");
  const count = Number(v.units);
  p.name = v.name.trim() || "Untitled property";
  p.location = v.location.trim();
  p.startDate = v.start + "-01";
  p.acquisitionDate = p.startDate;
  p.months = Number(v.hold ?? 5) * 12;
  p.price = Number(v.price || 0);
  p.closing = 0;
  p.initialCapex = 0;
  p.openingCash = 0;
  p.minimumCash = 0;
  p.asOfEquity = Number(v.equity || 0);
  p.rentGrowth = 0;
  p.management = 0;
  p.creditLoss = 0;
  p.otherMonthly = 0;
  p.reservesMonthly = 0;
  p.contingency = 0;
  p.budget = [];
  p.actuals = [];
  p.historical = [];
  p.units = Array.from({ length: count }, (_, i) => ({
    ...newUnit(i + 1),
    rent: Number(v.rent || 0) / count,
    marketRent: Number(v.rent || 0) / count,
    occupied: !dev,
    availableMonth: dev ? 61 : 1,
    leaseEnd: 0,
    renewalIncrease: 0,
    renovationCost: 0,
    renovationMonth: 0,
    renovatedRent: 0,
    targetMonth: 0,
    targetRent: 0,
    saleMonth: 0,
    salePrice: 0,
  }));
  p.expenses = [
    {
      id: uid(),
      name: "Entered operating expenses",
      annual: Number(v.expenses || 0),
      growth: 0,
      startMonth: 1,
      changeMonth: 0,
      replacementAnnual: 0,
      reimbursement: 0,
    },
  ];
  p.loans =
    Number(v.loan || 0) > 0
      ? [
          {
            ...newLoan(),
            amount: Number(v.loan),
            rate: Number(v.rate) / 100,
            fee: 0,
            maturityMonth: 60,
          },
        ]
      : [];
  p.lender.periodStart = 1;
  p.lender.value = p.price;
  p.lender.reserveAnnual = 0;
  p.waterfall.enabled = false;
  const goingInCap =
    p.price > 0
      ? (Number(v.rent || 0) * 12 - Number(v.expenses || 0)) / p.price
      : 0;
  p.exitCap = v.exitCap
    ? Number(v.exitCap) / 100
    : Math.max(0.001, goingInCap + 0.00625);
  p.sellingCost = Number(v.sellingCosts ?? 2.5) / 100;
  p.discount = Number(v.requiredReturn ?? 10) / 100;
  if (p.loans[0]) {
    p.loans[0].amortMonths = Number(v.amortization ?? 30) * 12;
    p.loans[0].maturityMonth = Number(v.maturity ?? 10) * 12;
  }
  p.tax.enabled = false;
  p.tax.depreciableBasis = 0;
  p.tax.saleBasis = 0;
  p.partners = [{ id: "owner", name: "Owner", share: 1 }];
  p.waterfall.sponsorId = "owner";
  p.evidence = description.trim()
    ? [
        {
          id: uid(),
          type: "other",
          value: 0,
          title: "Starting description",
          source: "User-entered setup",
          date: p.startDate,
          status: "unverified",
          note: description,
        },
      ]
    : [];
  p.tasks = [
    {
      id: uid(),
      title: "Complete and verify underwriting assumptions",
      owner: "",
      due: "",
      status: "open",
      note: "Review closing costs, cash reserves, vacancy, capital plans, loan terms, exit assumptions and source documents. Setup only includes entered figures; missing costs are zero.",
    },
  ];
  return p;
}

export function sampleProject(): Project {
  return sharedSample();
}
