import { it, expect } from "vitest";
import { toolMatch, toolTopics } from "./toolTopics";

it("finds tools by name or by the topics they cover", () => {
  expect(toolMatch("overview", "Property overview", "")).toBe("");
  expect(toolMatch("overview", "Property overview", "overview")).toBe("");
  expect(toolMatch("actuals", "Actuals & variance", "noi")).toBe("NOI");
  expect(toolMatch("finance", "Debt & borrowing capacity", "LTV")).toBe("LTV");
  expect(toolMatch("calendar", "Leasing & project calendar", "noi")).toBeNull();
});
it("every tool has topics", () => {
  expect(Object.keys(toolTopics)).toHaveLength(19);
});
