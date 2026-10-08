import { describe, expect, it } from "vitest";
import { demo } from "../finance/demo";
import { calculate } from "../finance/model";
import { forecast } from "../advanced/engine";
import { monthlyFromAnnual } from "../finance/sharedSample";
import {
  annualBridge,
  monthlyBridge,
  annualRecovery,
  monthlyRecovery,
  annualTornado,
  monthlyTornado,
  defaultTornado,
  validTornado,
} from "./visuals";
import { chartCsv } from "../ui/FinancialChart";
import { parseMoney } from "../ui/MoneyInput";
import { originOf, provenance } from "../data/provenance";
import { checkProject, decodeWorkspace } from "../advanced/store";
import { decodeSaved, encodeSaved, freshAnalysis } from "../data/storage";
describe("shipping financial visual reconciliation", () => {
  it("retained operating surplus is distributed at its actual exit date", () => {
    const p = monthlyFromAnnual(demo);
    p.distribute = false;
    const f = forecast(p),
      r = monthlyRecovery(p, f);
    expect(r.slice(0, -1).every((x) => x.operatingDistributions === 0)).toBe(
      true,
    );
    const operating = f.rows.reduce(
      (s, x) => s + x.noi - x.debtService - x.capex - x.reserves,
      0,
    );
    expect(r.at(-1)!.operatingDistributions).toBeCloseTo(operating, 6);
    expect(r.at(-1)!.operatingDistributions!).toBeLessThanOrEqual(
      r.at(-1)!.distributions!,
    );
  });
  it.each([3, 5, 10])(
    "annual bridge and recovery reconcile through a %i year hold",
    (hold) => {
      const a = { ...demo, hold },
        m = calculate(a),
        rows = annualRecovery(a, m);
      expect(rows).toHaveLength(hold + 1);
      for (const y of m.years.slice(0, hold)) {
        const b = annualBridge(y);
        expect(b.find((r) => r.label === "NOI")!.end).toBeCloseTo(y.noi, 7);
        const increments = b
          .filter((r) => !r.total)
          .reduce((sum, r) => sum + r.value!, 0);
        expect(increments).toBeCloseTo(y.operatingCash!, 7);
      }
      const end = rows.at(-1)!;
      expect(end.distributions! + end.sale! - end.contributions!).toBeCloseTo(
        m.flows!.reduce((s, v) => s + v, 0),
        6,
      );
    },
  );
  it("negative operating cash creates contributions rather than negative distributions", () => {
    const a = { ...demo, annualCapex: 300000 },
      m = calculate(a),
      rows = annualRecovery(a, m);
    expect(rows[1].contributions!).toBeGreaterThan(m.initialEquity);
    expect(rows[1].distributions).toBe(0);
  });
  it("unsupported maturity keeps unknown values missing", () => {
    const a = { ...demo, maturity: 2 },
      m = calculate(a),
      rows = annualRecovery(a, m);
    expect(rows.at(-1)!.sale).toBeNull();
    expect(rows[2].contributions).toBeNull();
    expect(annualBridge(m.years[1]).at(-1)!.value).toBeNull();
  });
  it("monthly vacancy bridges include economic and physical loss exactly once", () => {
    const p = monthlyFromAnnual(demo);
    p.units[0].occupied = false;
    p.units[0].availableMonth = 6;
    const f = forecast(p);
    for (const r of f.rows) {
      const b = monthlyBridge(p, r);
      expect(
        b.filter((x) => !x.total).reduce((s, x) => s + x.value!, 0),
      ).toBeCloseTo(r.noi - r.debtService - r.capex - r.reserves, 7);
    }
  });
  it("actual receipts do not re-deduct modeled vacancy", () => {
    const p = monthlyFromAnnual(demo);
    p.actuals = [
      {
        month: p.startDate.slice(0, 7),
        rent: 30000,
        otherIncome: 120,
        opex: 14000,
        capex: 900,
        debtService: 11000,
      },
    ];
    const r = forecast(p).rows[0],
      b = monthlyBridge(p, r);
    expect(b.find((x) => x.label === "Vacancy")!.value).toBeCloseTo(0, 8);
    expect(b.at(-1)!.value).toBeCloseTo(
      30000 + 120 - 14000 - 900 - 11000 - r.reserves,
      8,
    );
  });
  it("monthly owner funding and distributions reconcile to dated cash flows", () => {
    const p = monthlyFromAnnual(demo);
    p.initialCapex = 200000;
    p.annualCapex = 400000;
    const f = forecast(p),
      last = monthlyRecovery(p, f).at(-1)!;
    expect(last.contributions).toBeCloseTo(
      f.initialEquity + f.additionalEquity,
      6,
    );
    expect(last.distributions! - last.contributions!).toBeCloseTo(
      f.flows.reduce((s, v) => s + v.amount, 0),
      6,
    );
    expect(last.sale).toBeCloseTo(f.rows.at(-1)!.saleNetProceeds!, 6);
    expect(f.rows.at(-1)!.saleNetProceeds).toBeCloseTo(
      f.rows.at(-1)!.netSale - f.rows.at(-1)!.payoffs - f.rows.at(-1)!.fees,
      6,
    );
  });
  it("same-month refinancing payoff is not deducted again from net sale", () => {
    const p = monthlyFromAnnual(demo);
    p.loans[0].refiMonth = p.months;
    p.loans[0].refiAmount = 1500000;
    const f = forecast(p),
      last = f.rows.at(-1)!;
    const refi = f.debt.find((d) => d.month === p.months && d.refinance > 0)!;
    expect(last.saleNetProceeds).toBeCloseTo(
      last.netSale - (last.payoffs - refi.payoff) - (last.fees - refi.fee),
      6,
    );
  });
  it("annual tornado uses one changed assumption and percentage points", () => {
    const rows = annualTornado(demo, defaultTornado),
      rent = rows.find((r) => r.label === "Rental income")!;
    const independent = calculate({ ...demo, rent: demo.rent * 1.1 });
    expect(rent.higher).toBeCloseTo(
      (independent.irr! - calculate(demo).irr!) * 100,
      8,
    );
    expect(rows).toHaveLength(5);
    expect(demo.rent).toBe(1900);
  });
  it("rent-roll mode explicitly reports inapplicable vacancy", () => {
    const a = {
      ...demo,
      mode: "rentRoll" as const,
      occupiedMonthlyRent: 36000,
    };
    const row = annualTornado(a, defaultTornado).find(
      (r) => r.label === "Vacancy",
    )!;
    expect(row.lower).toBeNull();
    expect(row.higherReason).toMatch(/rent-roll/);
  });
  it("invalid shocks and unsupported base returns are not turned into zero effects", () => {
    expect(validTornado({ amount: NaN, points: 0.5 })).toBe(false);
    expect(annualTornado(demo, { amount: 0, points: 0.5 })).toEqual([]);
    const rows = annualTornado({ ...demo, maturity: 1 }, defaultTornado);
    expect(rows.every((r) => r.lower === null && r.higher === null)).toBe(true);
    const p = monthlyFromAnnual(demo);
    p.sellAtEnd = false;
    p.distribute = false;
    expect(
      monthlyTornado(p, defaultTornado).every((r) => r.lower === null),
    ).toBe(true);
  });
  it("monthly tornado preserves actual overrides and original project", () => {
    const p = monthlyFromAnnual(demo),
      snapshot = JSON.stringify(p);
    const rows = monthlyTornado(p, defaultTornado),
      r = rows.find((r) => r.label === "Rental income")!;
    const q = structuredClone(p);
    q.units = q.units.map((u) => ({
      ...u,
      rent: u.rent * 1.1,
      marketRent: u.marketRent * 1.1,
      targetRent: u.targetRent * 1.1,
      renovatedRent: u.renovatedRent * 1.1,
    }));
    expect(r.higher).toBeCloseTo(
      (forecast(q).irr! - forecast(p).irr!) * 100,
      8,
    );
    expect(JSON.stringify(p)).toBe(snapshot);
  });
});
describe("portable provenance and exports", () => {
  it("example origin survives renamed duplicates and backup decoding", () => {
    const p = {
      ...monthlyFromAnnual(demo),
      id: "new-copy",
      name: "My renamed investment",
      price: 3100000,
    };
    expect(originOf(p)).toBe("example");
    expect(
      decodeWorkspace(
        JSON.stringify({ version: 2, projects: [p], revisions: [] }),
      ).projects[0].origin,
    ).toBe("example");
    expect(provenance(p)).toContain("not verified");
  });
  it("legacy example migration uses identity while unknown data stays unknown", () => {
    const p = monthlyFromAnnual(demo);
    delete p.origin;
    expect(checkProject(p).origin).toBe("example");
    p.name = "Renamed legacy";
    p.id = "unrecognized";
    expect(checkProject(p).origin).toBe("unknown");
    expect(freshAnalysis().origin).toBe("user");
    expect(() => checkProject({ ...p, origin: "verified" })).toThrow();
  });
  it("quick backups preserve edited example provenance", () => {
    const a = { ...demo, name: "Renamed", rent: 2000 };
    const entries = decodeSaved(
      encodeSaved([
        {
          id: "a",
          name: a.name,
          savedAt: "2026-10-08",
          assumptions: a,
          scenarios: { upside: {}, downside: {} },
        },
      ]),
    );
    expect(entries[0].assumptions.origin).toBe("example");
  });
  it("CSV distinguishes blank unsupported data from zero and neutralizes spreadsheet formulas", () => {
    const text = chartCsv(
      "Title",
      "Fictional assumptions",
      ["USD"],
      [
        { label: "=formula", values: [null] },
        { label: "Zero", values: [0] },
        { label: "Negative", values: [-15] },
      ],
    );
    expect(text).toContain('"\'=formula",""');
    expect(text).toContain('"Zero","0"');
    expect(text).toContain('"Negative","-15"');
  });
  it.each(["", "-", "abc", "1e3", "Infinity"])(
    "money input rejects missing/invalid %s",
    (raw) => expect(Number.isNaN(parseMoney(raw))).toBe(true),
  );
  it.each([
    ["$1,234.50", 1234.5],
    ["0", 0],
    ["-$75.20", -75.2],
    ["3.", 3],
    [".5", 0.5],
  ] as const)("money input accepts %s", (raw, n) =>
    expect(parseMoney(raw)).toBe(n),
  );
});
