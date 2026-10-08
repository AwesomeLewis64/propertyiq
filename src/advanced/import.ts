import type { RawTable } from "../data/rentRoll";
import type { Project, Actual, Unit, Budget } from "./types";
import { newUnit, uid } from "./defaults";
export type ImportKind =
  | "units"
  | "actuals"
  | "ledger"
  | "expenses"
  | "budget"
  | "loans"
  | "historical"
  | "assumptions";
export const fields: Record<ImportKind, string[]> = {
  units: [
    "id",
    "occupied",
    "rent",
    "marketRent",
    "availableMonth",
    "leaseEnd",
    "renovationMonth",
    "renovationMonths",
    "renovationCost",
    "renovatedRent",
    "targetMonth",
    "targetRent",
    "saleMonth",
    "salePrice",
  ],
  actuals: ["month", "rent", "otherIncome", "opex", "capex", "debtService"],
  ledger: ["date", "category", "amount"],
  expenses: [
    "name",
    "annual",
    "growth",
    "startMonth",
    "changeMonth",
    "replacementAnnual",
    "reimbursement",
  ],
  budget: ["name", "category", "amount", "start", "duration", "debtEligible"],
  loans: [
    "name",
    "amount",
    "rate",
    "amortMonths",
    "ioMonths",
    "maturityMonth",
    "refiMonth",
    "refiAmount",
    "refiRate",
  ],
  historical: ["date", "amount", "note"],
  assumptions: ["field", "value"],
};
export const required: Record<ImportKind, string[]> = {
  units: ["id", "occupied", "rent"],
  actuals: ["month", "rent", "otherIncome", "opex", "capex", "debtService"],
  ledger: ["date", "category", "amount"],
  expenses: ["name", "annual"],
  budget: ["name", "amount", "start", "duration"],
  loans: ["name", "amount", "rate", "amortMonths", "maturityMonth"],
  historical: ["date", "amount"],
  assumptions: ["field", "value"],
};
export type MapColumns = Record<string, number>;
const numeric = (v: unknown, label: string) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string" || !v.trim())
    throw new Error(`${label}: missing numeric amount.`);
  let text = v.trim();
  const negative = /^\(.*\)$/.test(text);
  text = text.replace(/^\(|\)$/g, "").replace(/[$\s]/g, "");
  if (text.includes(",") && !/^-?\d{1,3}(,\d{3})+(\.\d+)?%?$/.test(text))
    throw new Error(
      `${label}: ambiguous comma grouping; use decimal points and standard thousands groups.`,
    );
  text = text.replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?%?$/.test(text))
    throw new Error(`${label}: invalid number.`);
  const number =
    (Number(text.replace("%", "")) * (negative ? -1 : 1)) /
    (text.endsWith("%") ? 100 : 1);
  if (!Number.isFinite(number)) throw new Error(`${label}: invalid number.`);
  return number;
};
export function mapDefault(headers: string[], kind: ImportKind): MapColumns {
  const aliases: Record<string, string[]> = {
    id: ["unit", "unitid", "unitnumber"],
    occupied: ["status", "occupancystatus", "occupancy"],
    rent: [
      "contractrent",
      "monthlycontractrent",
      "monthlyrent",
      "scheduledrent",
    ],
    marketRent: ["market", "monthlymarketrent"],
    leaseEnd: ["leaseexpiration", "leaseexpirationdate", "leaseenddate"],
    name: ["description", "item"],
    opex: ["operatingexpenses"],
    debtService: ["debtpayment", "debtpayments"],
  };
  return Object.fromEntries(
    fields[kind].map((k) => [
      k,
      headers.findIndex((h) =>
        [k.toLowerCase(), ...(aliases[k] ?? [])].includes(
          h.replace(/[^a-z0-9]/gi, "").toLowerCase(),
        ),
      ),
    ]),
  );
}
export function applyTable(
  project: Project,
  raw: RawTable,
  kind: ImportKind,
  map: MapColumns,
): Project {
  for (const key of required[kind])
    if (map[key] === undefined || map[key] < 0)
      throw new Error(`Map required column: ${key}.`);
  const assigned = Object.values(map).filter((v) => v >= 0);
  if (new Set(assigned).size !== assigned.length)
    throw new Error("Map each source column once.");
  const p = structuredClone(project),
    ids = new Set<string>();
  const cell = (row: RawTable["rows"][number], key: string) =>
    map[key] >= 0 ? row[map[key]] : undefined;
  const data = raw.rows.map((row, i) => {
    const result: Record<string, unknown> = {};
    for (const key of fields[kind]) {
      const v = cell(row, key);
      if (v !== undefined && v !== null && String(v).trim() !== "")
        result[key] =
          v instanceof Date
            ? v.toISOString().slice(0, key === "month" ? 7 : 10)
            : v;
    }
    return { r: result, row: i + 2 };
  });
  if (kind === "units") {
    p.units = data.map(({ r, row }) => {
      const id = String(r.id ?? "").trim();
      if (!id || ids.has(id.toLowerCase()))
        throw new Error(`Row ${row}: missing or duplicate unit ID.`);
      ids.add(id.toLowerCase());
      const status = String(r.occupied).trim().toLowerCase();
      if (!["true", "false", "occupied", "vacant", "1", "0"].includes(status))
        throw new Error(
          `Row ${row}: occupied must be occupied/vacant or true/false.`,
        );
      const u: Unit = {
        ...newUnit(),
        id,
        occupied: ["true", "occupied", "1"].includes(status),
        marketRent: 0,
        availableMonth: ["true", "occupied", "1"].includes(status)
          ? 1
          : p.months + 13,
        leaseEnd: 0,
        renewalIncrease: 0,
        renovatedRent: 0,
        targetRent: 0,
        saleMonth: 0,
        salePrice: 0,
      };
      for (const [key, value] of Object.entries(r))
        if (key !== "id" && key !== "occupied") {
          const timeline = [
            "availableMonth",
            "leaseEnd",
            "renovationMonth",
            "targetMonth",
            "saleMonth",
          ].includes(key);
          const date =
            typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
              ? value
              : null;
          if (
            date &&
            (!Number.isFinite(Date.parse(date)) ||
              new Date(date).toISOString().slice(0, 10) !== date)
          )
            throw new Error(`Row ${row} ${key}: invalid calendar date.`);
          const dateMonth = date
            ? (Number(date.slice(0, 4)) - Number(p.startDate.slice(0, 4))) *
                12 +
              Number(date.slice(5, 7)) -
              Number(p.startDate.slice(5, 7)) +
              1
            : null;
          (u as unknown as Record<string, unknown>)[key] =
            timeline && dateMonth !== null
              ? Math.max(0, dateMonth)
              : numeric(value, `Row ${row} ${key}`);
        }
      return u;
    });
  }
  if (kind === "actuals")
    p.actuals = data.map(
      ({ r, row }) =>
        ({
          month: String(r.month),
          rent: numeric(r.rent, `Row ${row} rent`),
          otherIncome: numeric(r.otherIncome, "other income"),
          opex: numeric(r.opex, "opex"),
          capex: numeric(r.capex, "capex"),
          debtService: numeric(r.debtService, "debt service"),
        }) as Actual,
    );
  if (kind === "ledger") {
    const aggregated = new Map<string, Actual>();
    for (const { r, row } of data) {
      const month = String(r.date).slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(month))
        throw new Error(`Row ${row}: use ISO dates.`);
      const category = String(r.category);
      if (
        !["rent", "otherIncome", "opex", "capex", "debtService"].includes(
          category,
        )
      )
        throw new Error(
          `Row ${row}: category must be rent, otherIncome, opex, capex or debtService.`,
        );
      const amount = numeric(r.amount, `Row ${row} amount`);
      if (amount < 0)
        throw new Error(
          `Row ${row}: normalize ledger signs to positive gross income/outflows first.`,
        );
      const a = aggregated.get(month) ?? {
        month,
        rent: 0,
        otherIncome: 0,
        opex: 0,
        capex: 0,
        debtService: 0,
      };
      (a as unknown as Record<string, number>)[category] += amount;
      aggregated.set(month, a);
    }
    p.actuals = [...aggregated.values()].sort((a, b) =>
      a.month.localeCompare(b.month),
    );
  }
  if (kind === "expenses")
    p.expenses = data.map(({ r }) => ({
      id: uid(),
      name: String(r.name),
      annual: numeric(r.annual, "annual expense"),
      growth: r.growth === undefined ? 0 : numeric(r.growth, "growth"),
      startMonth:
        r.startMonth === undefined ? 1 : numeric(r.startMonth, "start"),
      changeMonth:
        r.changeMonth === undefined ? 0 : numeric(r.changeMonth, "change"),
      replacementAnnual:
        r.replacementAnnual === undefined
          ? 0
          : numeric(r.replacementAnnual, "replacement"),
      reimbursement:
        r.reimbursement === undefined
          ? 0
          : numeric(r.reimbursement, "reimbursement"),
    }));
  if (kind === "budget")
    p.budget = data.map(
      ({ r }) =>
        ({
          id: uid(),
          name: String(r.name),
          category: ["hard", "soft", "other"].includes(String(r.category))
            ? r.category
            : "other",
          amount: numeric(r.amount, "amount"),
          start: numeric(r.start, "start"),
          duration: numeric(r.duration, "duration"),
          debtEligible:
            r.debtEligible === undefined
              ? true
              : ["true", "yes", "1"].includes(
                  String(r.debtEligible).toLowerCase(),
                ),
        }) as Budget,
    );
  if (kind === "loans") {
    const { newLoan } = loanDefaults;
    p.loans = data.map(({ r }) => {
      const l = newLoan();
      l.name = String(r.name);
      for (const [k, v] of Object.entries(r))
        if (k !== "name")
          (l as unknown as Record<string, unknown>)[k] = numeric(v, k);
      return l;
    });
  }
  if (kind === "historical")
    p.historical = data.map(({ r }) => ({
      date: String(r.date),
      amount: numeric(r.amount, "historical amount"),
      note: String(r.note ?? ""),
    }));
  if (kind === "assumptions") {
    const allowed = [
      "price",
      "closing",
      "initialCapex",
      "openingCash",
      "minimumCash",
      "asOfEquity",
      "rentGrowth",
      "creditLoss",
      "otherMonthly",
      "management",
      "reservesMonthly",
      "contingency",
      "exitCap",
      "sellingCost",
      "discount",
      "months",
    ];
    for (const { r } of data) {
      const key = String(r.field);
      if (!allowed.includes(key))
        throw new Error(`Unsupported assumption: ${key}.`);
      if (ids.has(key)) throw new Error(`Duplicate assumption: ${key}.`);
      ids.add(key);
      (p as unknown as Record<string, unknown>)[key] = numeric(r.value, key);
    }
  }
  return p;
}
import * as loanDefaults from "./defaults";
