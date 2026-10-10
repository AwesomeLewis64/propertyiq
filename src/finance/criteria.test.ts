import { describe, it, expect } from "vitest";
import { demo } from "./demo";
import { calculate } from "./model";
import {
  criteriaOf,
  judge,
  quickActuals,
  withCriterion,
  yearlyCoc,
} from "./criteria";

describe("investment criteria", () => {
  it("keeps only usable saved numbers and treats a blank as no target", () => {
    expect(
      criteriaOf({ minDscr: 1.25, maxEquity: "1", minCoc: NaN, other: 2 }),
    ).toEqual({ minDscr: 1.25 });
    expect(criteriaOf(null)).toEqual({});
    expect(criteriaOf({ maxEquity: -1 })).toEqual({});
    expect(withCriterion({ minDscr: 1.2 }, "minDscr", NaN)).toEqual({});
    expect(withCriterion({}, "minCoc", 0.08)).toEqual({ minCoc: 0.08 });
  });
  it("reports meets, misses or not enough information per target", () => {
    const actual = { irr: 0.12, dscr: 1.1, equity: 500_000, coc: null };
    const states = (t: ReturnType<typeof judge>) => t.map((x) => x.state);
    expect(
      states(
        judge(0.1, { minDscr: 1.25, maxEquity: 500_000, minCoc: 0.05 }, actual),
      ),
    ).toEqual(["meets", "misses", "meets", "unknown"]);
    // A blank target and a model with errors are never shown as a pass.
    expect(states(judge(undefined, {}, actual))).toEqual(
      Array(4).fill("unknown"),
    );
    expect(
      states(judge(0.1, { minDscr: 1, maxEquity: 1e9, minCoc: 0 }, null)),
    ).toEqual(Array(4).fill("unknown"));
    expect(judge(0.1, { maxEquity: 400_000 }, actual)[2].state).toBe("misses");
  });
  it("reads the Year 1 figures of the Quick model", () => {
    const m = calculate(demo),
      y = m.years[0];
    expect(quickActuals(m)).toEqual({
      irr: m.irr,
      dscr: y.dscr,
      equity: m.initialEquity,
      coc: y.operatingCash! / m.initialEquity,
    });
    expect(quickActuals(calculate({ ...demo, price: 0 }))).toBeNull();
  });
  it("yearly cash-on-cash: Year 1 equals the existing metric and sale stays separate", () => {
    const m = calculate(demo),
      rows = yearlyCoc(m, demo.hold);
    expect(rows).toHaveLength(demo.hold);
    // The same expression the deal summary and KPI row use.
    expect(rows[0].coc).toBe(m.years[0].operatingCash! / m.initialEquity);
    rows.forEach((r, i) =>
      expect(r.coc).toBe(m.years[i].operatingCash! / m.initialEquity),
    );
    expect(rows.map((r) => r.sale)).toEqual([
      ...Array(demo.hold - 1).fill(null),
      m.netSale,
    ]);
  });
  it("yearly cash-on-cash is negative, not hidden, when operating cash is negative", () => {
    const m = calculate({ ...demo, vacancy: 0.6 });
    const rows = yearlyCoc(m, demo.hold);
    expect(m.errors).toEqual([]);
    expect(rows[0].operatingCash!).toBeLessThan(0);
    expect(rows[0].coc!).toBeLessThan(0);
  });
});
