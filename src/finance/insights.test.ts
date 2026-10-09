import { describe, it, expect } from "vitest";
import { calculate } from "./model";
import { insights } from "./insights";
import { demo } from "./demo";

describe("insights exit-cap stress", () => {
  it.each(["manual", "spread"] as const)(
    "lowers IRR when the exit cap rises by 50 bps in %s mode",
    (exitCapMode) => {
      const a = { ...structuredClone(demo), exitCapMode };
      const m = calculate(a);
      const item = insights(a, m).find((i) => i.target === "sensitivity");
      expect(item).toBeDefined();
      const change = Number(item!.title.match(/by (-?[\d.]+) percentage/)![1]);
      expect(change).toBeLessThan(0);
    },
  );
});
