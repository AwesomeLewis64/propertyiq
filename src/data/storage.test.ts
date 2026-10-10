import { describe, it, expect } from "vitest";
import {
  decodeSaved,
  encodeSaved,
  isAssumptions,
  isScenarios,
  saveAnalysis,
  STORAGE_KEY,
} from "./storage";
import { demo } from "../finance/demo";
describe("Local saved analysis validation", () => {
  it("empty browser storage has no saved analyses", () =>
    expect(decodeSaved(null)).toEqual([]));
  it("valid snapshots round-trip through a versioned schema", () => {
    const data = {
      id: "test",
      name: demo.name,
      savedAt: "2026-10-08T00:00:00Z",
      assumptions: demo,
      scenarios: { upside: { rentGrowth: 0.04 }, downside: {} },
    };
    expect(decodeSaved(encodeSaved([data]))).toEqual([data]);
  });
  it("saved criteria round-trip and older saves without them still load", () => {
    const data = {
      id: "test",
      name: demo.name,
      savedAt: "2026-10-09T00:00:00Z",
      assumptions: { ...demo, criteria: { minDscr: 1.3, maxEquity: 500000 } },
      scenarios: { upside: {}, downside: {} },
    };
    expect(decodeSaved(encodeSaved([data]))).toEqual([data]);
    expect(isAssumptions(demo)).toBe(true);
    expect("criteria" in demo).toBe(false);
  });
  it("malformed or unsupported storage is rejected", () => {
    for (const value of [
      "invalid",
      "null",
      "{}",
      '{"version":2,"analyses":[]}',
      '{"version":1,"analyses":[{}]}',
    ])
      expect(() => decodeSaved(value)).toThrow();
  });
  it("invalid enums, nulls, NaN and missing fields are rejected before model execution", () => {
    expect(isAssumptions({ ...demo, mode: "bad" })).toBe(false);
    expect(isAssumptions({ ...demo, price: null })).toBe(false);
    expect(isAssumptions({ ...demo, price: NaN })).toBe(false);
    expect(isAssumptions({ name: "test" })).toBe(false);
    expect(isScenarios({ upside: { rentGrowth: NaN }, downside: {} })).toBe(
      false,
    );
  });
  it("saving preserves snapshots and never changes current assumptions", () => {
    const values = new Map<string, string>(),
      storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      };
    const a = structuredClone(demo);
    const saved = saveAnalysis(storage, a, { upside: {}, downside: {} });
    a.rent = 2000;
    expect(saved[0].assumptions.rent).toBe(1900);
    expect(values.has(STORAGE_KEY)).toBe(true);
  });
  it("does not overwrite malformed existing data or exceed the saved limit", () => {
    const storage = {
      getItem: () => "{bad",
      setItem: () => {
        throw new Error("Must not write");
      },
    };
    expect(() =>
      saveAnalysis(storage, demo, { upside: {}, downside: {} }),
    ).toThrow();
    expect(() => encodeSaved(Array(21).fill({}))).toThrow();
  });
});
