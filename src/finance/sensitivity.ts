import { calculate } from "./model";
import type { Assumptions, Model } from "./types";
export type GridKind = "rent" | "debt" | "vacancy" | "value";
export type GridMetric = "irr" | "equity" | "dscr" | "noi" | "value";
export type ScenarioCell = {
  row: number;
  col: number;
  value: number | null;
  assumptions: Assumptions;
  model: Model;
  forwardNOI?: number;
};
export type Grid = {
  rows: number[];
  cols: number[];
  rowLabel: string;
  colLabel: string;
  metric: GridMetric;
  cells: ScenarioCell[][];
};
const range = (base: number, step: number, min: number, max: number) =>
  [-2, -1, 0, 1, 2].map((i) => Math.max(min, Math.min(max, base + i * step)));
export function buildGrid(
  a: Assumptions,
  kind: GridKind,
  metric: GridMetric = "irr",
): Grid {
  const base = calculate(a);
  let rows: number[], cols: number[], rowLabel: string, colLabel: string;
  if (kind === "rent") {
    const going = base.years[0]?.noi / a.price;
    const exit = base.effectiveExitCap ?? a.exitCap;
    rows = [
      Math.max(0.001, Math.min(exit - 0.005, going - 0.005)),
      Math.max(0.001, going),
      exit,
      Math.min(1, going + 0.01),
      Math.min(1, Math.max(exit + 0.01, going + 0.015)),
    ];
    cols = range(a.rentGrowth, 0.01, -1, 1);
    rowLabel = "Exit cap rate";
    colLabel = "Rent growth";
    metric = "irr";
  } else if (kind === "debt") {
    rows = range(a.rate, 0.005, 0, 1);
    cols = range(a.price, a.price * 0.1, 1, 1e12);
    rowLabel = "Interest rate";
    colLabel = "Acquisition price";
    metric = metric === "equity" ? "equity" : "dscr";
  } else if (kind === "vacancy") {
    rows = range(a.vacancy, 0.02, 0, 1);
    cols = range(a.expenseGrowth, 0.01, -1, 1);
    rowLabel = "Economic vacancy";
    colLabel = "Expense growth";
    metric = metric === "noi" ? "noi" : "irr";
  } else {
    rows = range(base.effectiveExitCap ?? a.exitCap, 0.005, 0.001, 1);
    cols = range(base.forwardNOI, Math.abs(base.forwardNOI) * 0.1, -1e12, 1e12);
    rowLabel = "Exit cap rate";
    colLabel = "Forward NOI";
    metric = "value";
  }
  const cells = rows.map((row) =>
    cols.map((col) => {
      let changed: Assumptions = { ...a, expenses: { ...a.expenses } };
      if (kind === "rent")
        changed = {
          ...changed,
          exitCapMode: "manual",
          exitCap: row,
          rentGrowth: col,
        };
      if (kind === "debt") changed = { ...changed, rate: row, price: col };
      if (kind === "vacancy")
        changed = { ...changed, vacancy: row, expenseGrowth: col };
      if (kind === "value")
        changed = { ...changed, exitCapMode: "manual", exitCap: row };
      const model = calculate(changed);
      const value = model.errors.length
        ? null
        : metric === "irr"
          ? model.irr
          : metric === "equity"
            ? model.initialEquity
            : metric === "dscr"
              ? model.years[0].dscr
              : metric === "noi"
                ? model.years[a.hold - 1].noi
                : col > 0
                  ? col / row
                  : null;
      return {
        row,
        col,
        value,
        assumptions: changed,
        model,
        ...(kind === "value" ? { forwardNOI: col } : {}),
      };
    }),
  );
  return { rows, cols, rowLabel, colLabel, metric, cells };
}
export type ScenarioOverrides = Partial<
  Pick<
    Assumptions,
    | "rentGrowth"
    | "vacancy"
    | "exitCap"
    | "expenseGrowth"
    | "rate"
    | "exitCapMode"
  >
>;
export function defaultScenarios(a: Assumptions): {
  upside: ScenarioOverrides;
  downside: ScenarioOverrides;
} {
  const vacancyMax = 1 - a.creditLoss - a.concessions;
  return {
    upside: {
      exitCapMode: "manual",
      rentGrowth: Math.min(1, a.rentGrowth + 0.01),
      vacancy: Math.max(0, a.vacancy - 0.02),
      exitCap: Math.max(
        0.001,
        (calculate(a).effectiveExitCap ?? a.exitCap) - 0.005,
      ),
      expenseGrowth: Math.max(-1, a.expenseGrowth - 0.005),
    },
    downside: {
      exitCapMode: "manual",
      rentGrowth: Math.max(-1, a.rentGrowth - 0.01),
      vacancy: Math.min(vacancyMax, a.vacancy + 0.03),
      exitCap: Math.min(
        1,
        (calculate(a).effectiveExitCap ?? a.exitCap) + 0.005,
      ),
      expenseGrowth: Math.min(1, a.expenseGrowth + 0.01),
    },
  };
}
