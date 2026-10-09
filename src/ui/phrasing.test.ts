import { it, expect } from "vitest";
import { briefExamples, extractBrief } from "./startFlow";
import { readRoute } from "./routes";
it.each([
  ["$2.8M purchase", { price: 2800000 }],
  ["purchase price $2,800,000", { price: 2800000 }],
  ["price: 2.8 million", { price: 2800000 }],
  ["asking price is $900k", { price: 900000 }],
  ["24-unit building for $3.1 million", { units: 24, price: 3100000 }],
  ["20 units at $1,550/mo", { units: 20, rent: 31000 }],
  ["20 apartments; rents are $1,550", { units: 20, rent: 31000 }],
  ["8 units; per-unit rent $1,200", { units: 8, rent: 9600 }],
  ["20 units; rent per unit is $1,550", { units: 20, rent: 31000 }],
  ["monthly rent of $9,600", { rent: 9600 }],
  ["$9,600 in monthly rental income", { rent: 9600 }],
  ["annual rental income: $115,200", { rent: 9600 }],
  ["$115,200 annual rent", { rent: 9600 }],
  ["annual operating expenses of $42k", { expenses: 42000 }],
  ["monthly operating expenses $3,500", { expenses: 42000 }],
  ["loan amount $780,000", { loan: 780000 }],
  ["$780k mortgage", { loan: 780000 }],
  ["6.25% rate", { rate: 6.25 }],
  ["interest rate: 6.25%", { rate: 6.25 }],
  ["65% LTV", { ltv: 65 }],
  ["$2.8M purchase; 65% LTV", { price: 2800000, ltv: 65, loan: 1820000 }],
  ["6.5 cap", { exitCap: 6.5 }],
  ["exit cap 7%", { exitCap: 7 }],
  [
    "Is a 24-unit building in St. Louis for $3.1 million a good deal if rents are $1,100?",
    { units: 24, price: 3100000, rent: 26400 },
  ],
  ["", {}],
  ["price NaN; interest rate infinity%; rent unknown", {}],
  ["annual expenses -$100", {}],
  ["0 units; 150% LTV; 999% rate", {}],
  ["$100 is a good price?", {}],
  ["a rent of $1,100 without a unit count", {}],
  ["1000000 units", {}],
])("extracts reviewed phrasing: %s", (text, expected) =>
  expect(extractBrief(text)).toEqual(expected),
);
it.each([
  [
    "#monthly/maple-grove-shared/finance",
    { mode: "monthly", project: "maple-grove-shared", section: "finance" },
  ],
  ["#monthly", { mode: "monthly", project: undefined, section: "overview" }],
  ["#quick/debt", { mode: "quick", section: "debt" }],
  ["#privacy", { mode: "home" }],
  ["#monthly/%invalid/report", { mode: "home" }],
])("parses route %s", (text, expected) =>
  expect(readRoute(text)).toEqual(expected),
);

it.each([
  [
    0,
    {
      price: 2800000,
      units: 20,
      rent: 38000,
      rate: 6.25,
      ltv: 65,
      loan: 1820000,
    },
  ],
  [1, { units: 24, price: 3100000, rent: 26400, expenses: 120000 }],
  [2, { units: 12, price: 1450000, rent: 18600, rate: 7 }],
  [3, { units: 36, price: 5200000, rent: 51000, expenses: 210000 }],
  [4, { units: 8, rent: 11600, price: 980000, loan: 650000, rate: 6.5 }],
  [5, { units: 16, price: 2200000, rent: 19200, exitCap: 6 }],
])("composer hint %i extracts what it shows", (i, expected) => {
  expect(extractBrief(briefExamples[i])).toEqual(expected);
});
it("every composer hint has an extraction test", () => {
  expect(briefExamples).toHaveLength(6);
});
