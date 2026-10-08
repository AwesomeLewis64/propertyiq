import type { Assumptions } from "../finance/types";
import { demo } from "../finance/demo";
import { validate } from "../finance/model";
import { defaultScenarios } from "../finance/sensitivity";
import type { ScenarioSettings } from "../ui/Sensitivity";
export type SavedAnalysis = {
  id: string;
  name: string;
  savedAt: string;
  assumptions: Assumptions;
  scenarios: ScenarioSettings;
};
export const STORAGE_KEY = "propertyiq:analyses:v1";
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
export function isAssumptions(value: unknown): value is Assumptions {
  if (!record(value) || !record(value.expenses)) return false;
  for (const [key, defaultValue] of Object.entries(demo)) {
    if (key === "expenses") {
      for (const expense of Object.keys(demo.expenses))
        if (typeof value.expenses[expense] !== "number") return false;
    } else if (typeof value[key] !== typeof defaultValue) return false;
  }
  if (
    !["manual", "rentRoll"].includes(value.mode as string) ||
    !["ltv", "amount"].includes(value.loanMode as string) ||
    !["fixed", "percent"].includes(value.managementMode as string)
  )
    return false;
  return validate(value as Assumptions).length === 0;
}
export function isScenarios(value: unknown): value is ScenarioSettings {
  if (!record(value)) return false;
  return ["upside", "downside"].every((key) => {
    const group = value[key];
    return (
      record(group) &&
      Object.entries(group).every(
        ([k, v]) =>
          [
            "rentGrowth",
            "vacancy",
            "exitCap",
            "expenseGrowth",
            "rate",
          ].includes(k) &&
          typeof v === "number" &&
          Number.isFinite(v) &&
          v >= (["rentGrowth", "expenseGrowth"].includes(k) ? -1 : 0) &&
          v <= 1 &&
          (k !== "exitCap" || v > 0),
      )
    );
  });
}
export function decodeSaved(text: string | null): SavedAnalysis[] {
  if (text === null) return [];
  const decoded: unknown = JSON.parse(text);
  if (
    !record(decoded) ||
    decoded.version !== 1 ||
    !Array.isArray(decoded.analyses) ||
    decoded.analyses.length > 20
  )
    throw new Error("Saved analyses use an unsupported or damaged format.");
  for (const entry of decoded.analyses)
    if (
      !record(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.name !== "string" ||
      typeof entry.savedAt !== "string" ||
      !isAssumptions(entry.assumptions) ||
      !isScenarios(entry.scenarios)
    )
      throw new Error(
        "A saved analysis is invalid. Export or clear damaged local data before saving new analyses.",
      );
  return decoded.analyses as SavedAnalysis[];
}
export function encodeSaved(items: SavedAnalysis[]): string {
  if (items.length > 20)
    throw new Error("Save up to 20 analyses; delete an old analysis first.");
  return JSON.stringify({ version: 1, analyses: items });
}
export function saveAnalysis(
  storage: Pick<Storage, "getItem" | "setItem">,
  a: Assumptions,
  scenarios: ScenarioSettings,
): SavedAnalysis[] {
  if (!isAssumptions(a) || !isScenarios(scenarios))
    throw new Error("Correct invalid assumptions before saving.");
  const defaults = defaultScenarios(a);
  if (
    validate({ ...a, ...defaults.upside, ...scenarios.upside }).length ||
    validate({ ...a, ...defaults.downside, ...scenarios.downside }).length
  )
    throw new Error("Correct invalid scenario assumptions before saving.");
  const saved = decodeSaved(storage.getItem(STORAGE_KEY));
  const entry: SavedAnalysis = {
    id: crypto.randomUUID(),
    name: a.name || "Untitled property",
    savedAt: new Date().toISOString(),
    assumptions: structuredClone(a),
    scenarios: structuredClone(scenarios),
  };
  const next = [entry, ...saved];
  storage.setItem(STORAGE_KEY, encodeSaved(next));
  return next;
}
export function freshAnalysis(): Assumptions {
  return {
    ...structuredClone(demo),
    name: "Untitled property",
    location: "",
    units: 1,
    price: 0,
    rent: 0,
    otherIncome: 0,
    closingCosts: 0,
    initialCapex: 0,
    annualCapex: 0,
    reserves: 0,
    expenses: {
      taxes: 0,
      insurance: 0,
      repairs: 0,
      utilities: 0,
      payroll: 0,
      administration: 0,
      marketing: 0,
      other: 0,
    },
  };
}
