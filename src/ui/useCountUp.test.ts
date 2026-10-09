import { it, expect } from "vitest";
import { countFrame } from "./useCountUp";

it("count-up starts at the old value, eases out and lands exactly on the new one", () => {
  expect(countFrame(0, 254732, 0)).toBe(0);
  expect(countFrame(0, 254732, 1)).toBe(254732);
  expect(countFrame(0, 254732, 2)).toBe(254732);
  expect(countFrame(100, 50, 1)).toBe(50);
  // Ease-out: most of the distance is covered early.
  expect(countFrame(0, 100, 0.5)).toBeGreaterThan(90);
});
