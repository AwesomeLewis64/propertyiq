import { describe, it, expect } from "vitest";
import {
  extractBrief,
  setupProject,
  sampleProject,
  type SetupValues,
} from "./startFlow";
import { forecast } from "../advanced/engine";
import { checkProject } from "../advanced/store";
const input: SetupValues = {
  name: "Reviewed property",
  location: "",
  strategy: "acquisition",
  units: "8",
  rent: "9600",
  price: "1200000",
  expenses: "42000",
  loan: "780000",
  rate: "6",
  start: "2026-10",
  equity: "",
};
describe("focused start-flow checks", () => {
  it("extracts the supplied example without treating rent as a purchase price", () => {
    expect(
      extractBrief("Evaluate an 8-unit rental with $9,600 in monthly rent"),
    ).toEqual({ units: 8, rent: 9600 });
    expect(extractBrief("How should I review an asking price?")).toEqual({});
  });
  it("reads explicitly labeled annual amounts and financing while leaving unrecognized figures alone", () => {
    expect(
      extractBrief(
        "8 apartments; purchase price $1.2m; annual rent $115,200; annual expenses $42k; loan amount $780,000; interest rate 6%; exit cap 7%.",
      ),
    ).toEqual({
      units: 8,
      price: 1200000,
      rent: 9600,
      expenses: 42000,
      loan: 780000,
      rate: 6,
    });
  });
  it("creates the reviewed model without fictional renovations, costs or tax basis", () => {
    const p = setupProject(input, "User description");
    expect(checkProject(p)).toEqual(p);
    expect(p.units).toHaveLength(8);
    expect(
      p.units.every(
        (u) => u.rent === 1200 && u.renovationCost === 0 && u.targetMonth === 0,
      ),
    ).toBe(true);
    expect(p.budget).toEqual([]);
    expect(p.tax.depreciableBasis).toBe(0);
    expect(p.loans[0].amount).toBe(780000);
    expect(p.loans[0].rate).toBe(0.06);
    expect(p.evidence[0].note).toBe("User description");
  });
  it("keeps the sample report consistent with its landing-page income figures", () => {
    const f = forecast(sampleProject()),
      first = f.rows.slice(0, 12);
    expect(f.errors).toEqual([]);
    expect(first.reduce((s, r) => s + r.rent, 0)).toBeCloseTo(115200, 7);
    expect(first.reduce((s, r) => s + r.expenses, 0)).toBeCloseTo(42000, 7);
    expect(first.reduce((s, r) => s + r.noi, 0)).toBeCloseTo(73200, 7);
  });
});
