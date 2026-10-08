import { describe, it, expect } from "vitest";
import {
  aggregate,
  applyRentRoll,
  autoMapping,
  mapRows,
  normalizeTable,
  parseAmount,
  checkXlsxArchive,
} from "./rentRoll";
import { parseCsv } from "./parse";
import { demo } from "../finance/demo";
import { operating } from "../finance/model";
const csv =
  "Unit,Status,Rent,Market Rent,Lease Expiration\n101,Occupied,1000,1200,2027-01-31\n102,Occupied,1100,1200,2027-02-28\n103,Vacant,0,1200,";
const rows = (text = csv) => {
  const raw = parseCsv(text);
  return mapRows(raw, autoMapping(raw.headers));
};
describe("Phase 3 rent-roll import", () => {
  it("parses and maps common aliases; aggregates contractual and market rent exactly", () => {
    const s = aggregate(rows())!;
    expect(s.units).toBe(3);
    expect(s.occupied).toBe(2);
    expect(s.vacant).toBe(1);
    expect(s.monthlyContract).toBe(2100);
    expect(s.annualContract).toBe(25200);
    expect(s.averageOccupied).toBe(1050);
    expect(s.averageMarket).toBe(1200);
    expect(s.annualMarket).toBe(43200);
    expect(s.marketGap).toBe(18000);
    expect(s.occupancy).toBeCloseTo(2 / 3, 10);
  });
  it("applying a roll explicitly updates only units, mode and contractual rent", () => {
    const before = structuredClone(demo),
      a = applyRentRoll(demo, aggregate(rows())!);
    expect(demo).toEqual(before);
    expect(a.mode).toBe("rentRoll");
    expect(a.vacancy).toBe(0.05);
    expect(a.expenses).toEqual(demo.expenses);
    expect(a.units).toBe(3);
    expect(a.occupiedMonthlyRent).toBe(2100);
  });
  it("physical vacancy is never deducted twice after applying", () => {
    const a = {
      ...applyRentRoll(demo, aggregate(rows())!),
      creditLoss: 0,
      concessions: 0,
      otherIncome: 0,
    };
    expect(operating(a, 1).egi).toBe(25200);
  });
  it("quoted currency, comma amounts, BOM headers and blank records work", () => {
    const raw = parseCsv(
      '\uFEFFUnit,Status,Rent\r\n101,Occupied,"$1,250.50"\r\n\r\n',
    );
    expect(mapRows(raw, autoMapping(raw.headers))[0].contract).toBe(1250.5);
  });
  it("occupied invalid/missing rents and invalid statuses are rejected", () => {
    const r = rows(
      "Unit,Status,Rent\n1,Occupied,nope\n2,unknown,1000\n3,Occupied,",
    );
    expect(r.every((r) => r.errors.length > 0)).toBe(true);
    expect(aggregate(r)).toBeNull();
  });
  it("duplicate identifiers are preserved and block aggregation", () => {
    const r = rows("Unit,Status,Rent\nA,Occupied,1000\na,Occupied,900");
    expect(r.length).toBe(2);
    expect(r.every((v) => v.duplicate)).toBe(true);
    expect(aggregate(r)).toBeNull();
  });
  it("incomplete market rent yields N/A rather than extrapolating", () => {
    const r = rows(
      "Unit,Status,Rent,Market Rent\n1,Occupied,1000,1200\n2,Vacant,0,",
    );
    expect(aggregate(r)?.annualMarket).toBeNull();
    expect(aggregate(r)?.averageMarket).toBeNull();
  });
  it("all-vacant property yields zero occupied rent and N/A occupied average", () => {
    const s = aggregate(rows("Unit,Status,Rent\n1,Vacant,\n2,Vacant,0"))!;
    expect(s.monthlyContract).toBe(0);
    expect(s.averageOccupied).toBeNull();
    expect(s.occupancy).toBe(0);
  });
  it("vacant units with scheduled rents do not add occupied contractual revenue", () =>
    expect(
      aggregate(rows("Unit,Status,Rent\n1,Vacant,1500"))?.monthlyContract,
    ).toBe(0));
  it("Excel dates and US dates normalize; impossible dates are rejected", () => {
    const raw = normalizeTable([
      ["Unit", "Status", "Rent", "Lease Expiration"],
      ["1", "occupied", 1000, new Date("2027-01-31T00:00:00Z")],
      ["2", "occupied", 1000, "02/29/2027"],
    ]);
    const r = mapRows(raw, autoMapping(raw.headers));
    expect(r[0].expiration).toBe("2027-01-31");
    expect(r[1].errors).toHaveLength(1);
  });
  it("rejects malformed CSV, duplicate headers and missing mappings", () => {
    expect(() =>
      parseCsv('Unit,Status,Rent\n"unterminated,Occupied,1000'),
    ).toThrow();
    expect(() =>
      normalizeTable([
        ["unit", "UNIT"],
        ["1", "2"],
      ]),
    ).toThrow();
    const raw = parseCsv(csv);
    expect(() =>
      mapRows(raw, {
        unit: 0,
        status: 0,
        contract: 2,
        market: -1,
        expiration: -1,
      }),
    ).toThrow();
  });
  it("row and column limits are enforced", () => {
    expect(() =>
      normalizeTable([["a"], ...Array.from({ length: 5001 }, () => ["x"])]),
    ).toThrow();
    expect(() =>
      normalizeTable([Array.from({ length: 65 }, (_, i) => `c${i}`), ["x"]]),
    ).toThrow();
  });
  it("does not coerce booleans, negative values or formula text into money", () => {
    for (const v of [true, -1, "=1+2", "abc", "", "-100", "Infinity"])
      expect(parseAmount(v)).toBeNull();
    expect(parseAmount("$1,250.55")).toBe(1250.55);
  });
  it("extra cells beyond the headers are rejected", () => {
    const r = rows("Unit,Status,Rent\n1,Occupied,1000,extra");
    expect(r[0].errors).toContain("Too many cells for the header row.");
  });
  it("rejects malformed XLSX archives without decompression", () =>
    expect(() => checkXlsxArchive(new ArrayBuffer(100))).toThrow());
});
