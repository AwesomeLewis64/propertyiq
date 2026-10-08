import { newProject, newUnit, newLoan, uid } from "../advanced/defaults";
import type { Project } from "../advanced/types";

export type BriefNumbers = Partial<
  Record<"units" | "rent" | "price" | "expenses" | "loan" | "rate", number>
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
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }
}
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
  const put = (key: keyof BriefNumbers, n: number | undefined) => {
    if (n !== undefined) result[key] = n;
  };
  put("units", unitMatch ? Number(unitMatch[1]) : undefined);
  put(
    "rent",
    monthlyRent ?? (annualRent === undefined ? undefined : annualRent / 12),
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
    ) ?? text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:interest|loan rate)/i);
  put("rate", rate ? Number(rate[1]) : undefined);
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
};
export type WorkspaceLaunch = {
  project?: Project;
  tab?: "overview" | "imports" | "monthly" | "decisionlab" | "report";
  file?: File;
  decision?: "lenders" | "breakeven";
};

export function setupProject(v: SetupValues, description: string): Project {
  const p = newProject(v.strategy);
  const dev = v.strategy.startsWith("development");
  const count = Number(v.units);
  p.name = v.name.trim() || "Untitled property";
  p.location = v.location.trim();
  p.startDate = v.start + "-01";
  p.acquisitionDate = p.startDate;
  p.months = 60;
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
  const p = setupProject(
    {
      name: "Maple Court · illustrative sample",
      location: "Fictional property",
      strategy: "acquisition",
      units: "8",
      rent: "9600",
      price: "1200000",
      expenses: "42000",
      loan: "780000",
      rate: "6",
      start: "2026-10",
      equity: "",
    },
    "Illustrative sample only. These figures are not Walnut's actual results.",
  );
  p.closing = 24000;
  p.openingCash = 25000;
  p.minimumCash = 10000;
  p.loans[0].fee = 0.01;
  return p;
}
