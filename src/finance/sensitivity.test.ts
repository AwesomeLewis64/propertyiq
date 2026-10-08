import { describe, it, expect } from "vitest";
import { demo } from "./demo";
import { calculate } from "./model";
import { buildGrid, defaultScenarios } from "./sensitivity";
import { csvText, projectionCsv, debtCsv } from "../data/export";
import { insights } from "./insights";
describe("Phase 2 scenarios, exports and rule-based insights", () => {
  it("all four grids reconcile their center cell to the base model", () => {
    const m = calculate(demo);
    expect(buildGrid(demo, "rent").cells[2][2].value).toBe(m.irr);
    expect(buildGrid(demo, "debt", "equity").cells[2][2].value).toBe(
      m.initialEquity,
    );
    expect(buildGrid(demo, "debt", "dscr").cells[2][2].value).toBe(
      m.years[0].dscr,
    );
    expect(buildGrid(demo, "vacancy", "noi").cells[2][2].value).toBe(
      m.years[demo.hold - 1].noi,
    );
    expect(buildGrid(demo, "value").cells[2][2].value).toBe(m.grossExit);
  });
  it("price scenarios recompute LTV loan amounts, closing equity and debt coverage", () => {
    const grid = buildGrid(demo, "debt", "dscr"),
      cell = grid.cells[2][4];
    expect(cell.model.loan).toBe(3360000 * 0.65);
    expect(cell.model.initialEquity).toBeCloseTo(1333840, 8);
    expect(cell.value!).toBeLessThan(grid.cells[2][2].value!);
  });
  it("higher exit cap reduces value and IRR; higher rent growth raises returns", () => {
    const grid = buildGrid(demo, "rent");
    expect(grid.cells[4][2].value!).toBeLessThan(grid.cells[2][2].value!);
    expect(grid.cells[2][4].value!).toBeGreaterThan(grid.cells[2][2].value!);
  });
  it("every cash-flow sensitivity cell reconciles to an independent direct model call", () => {
    for (const kind of ["rent", "debt", "vacancy"] as const) {
      const grid = buildGrid(demo, kind);
      for (const cell of grid.cells.flat()) {
        const m = calculate(cell.assumptions);
        expect(cell.value).toBe(
          grid.metric === "dscr" ? m.years[0].dscr : m.irr,
        );
      }
    }
  });
  it("terminal value matrix follows the exact capitalization identity", () => {
    for (const cell of buildGrid(demo, "value").cells.flat())
      expect(cell.value).toBeCloseTo(cell.col / cell.row, 8);
  });
  it("invalid loss scenarios are unavailable rather than misleading", () => {
    const a = { ...demo, vacancy: 0.95, creditLoss: 0.04, concessions: 0.01 };
    expect(buildGrid(a, "vacancy").cells[4][2].value).toBeNull();
  });
  it("default cases preserve all base assumptions and produce distinct outcomes", () => {
    const s = defaultScenarios(demo);
    expect(calculate({ ...demo, ...s.upside }).irr!).toBeGreaterThan(
      calculate(demo).irr!,
    );
    expect(calculate({ ...demo, ...s.downside }).irr!).toBeLessThan(
      calculate(demo).irr!,
    );
  });
  it("export quotes values and protects spreadsheet formula text", () => {
    expect(csvText([["=CMD()", 'a"b', -2, null]])).toBe(
      '"\'=CMD()","a""b","-2",""',
    );
  });
  it("projection CSV has a consistent rectangular layout and Year 0 equity in the correct column", () => {
    const csv = projectionCsv(demo, calculate(demo));
    const rows = csv.split("\r\n").map((r) => r.split(","));
    expect(rows).toHaveLength(7);
    expect(rows.every((r) => r.length === 27)).toBe(true);
    expect(rows[1][25]).toBe('"-1134200"');
  });
  it("monthly CSV contains every monthly debt row exactly once", () =>
    expect(debtCsv(calculate(demo)).split("\r\n")).toHaveLength(61));
  it("insights reference actual debt coverage and respond to input changes", () => {
    const m = calculate(demo);
    expect(insights(demo, m)[0].title).toContain("1.89x");
    const a = { ...demo, annualCapex: 1000000 };
    expect(
      insights(a, calculate(a)).some((v) =>
        v.title.includes("Negative operating"),
      ),
    ).toBe(true);
  });
});
