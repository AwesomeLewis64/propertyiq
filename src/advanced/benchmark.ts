import { metricLabels, type MetricKey } from "./toolSchema";
export type StoredCell = string | number | boolean | null;
export function cellIndex(address: string): [number, number] {
  const match = /^([A-Z]{1,2})([1-9]\d{0,3})$/.exec(
    address.trim().toUpperCase(),
  );
  if (!match) throw new Error("Use a cell address such as B7.");
  const col =
      [...match[1]].reduce((v, c) => v * 26 + c.charCodeAt(0) - 64, 0) - 1,
    row = Number(match[2]) - 1;
  if (col >= 64 || row >= 5000)
    throw new Error("Cell is outside the supported 5,000 × 64 range.");
  return [row, col];
}
export function columnLabel(index: number): string {
  let value = index + 1,
    label = "";
  while (value > 0) {
    value--;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}
export function storedNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim())
    throw new Error(
      "The mapped cell has no stored numeric value. Recalculate and save the workbook in Excel first.",
    );
  let text = value.trim();
  const neg = /^\(.*\)$/.test(text);
  text = text.replace(/^\(|\)$/g, "").replace(/[$\s]/g, "");
  if (text.includes(",") && !/^-?\d{1,3}(,\d{3})+(\.\d+)?%?$/.test(text))
    throw new Error("Ambiguous comma grouping in benchmark value.");
  text = text.replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?%?$/.test(text))
    throw new Error(
      "The mapped benchmark must be a stored number, currency, or percentage.",
    );
  const number =
    (Number(text.replace("%", "")) * (neg ? -1 : 1)) /
    (text.endsWith("%") ? 100 : 1);
  if (!Number.isFinite(number)) throw new Error("Invalid benchmark value.");
  return number;
}
export function metricKey(text: unknown): MetricKey | null {
  const normalized = String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const found = (Object.entries(metricLabels) as [MetricKey, string][]).find(
    ([key, label]) =>
      [key, label].some(
        (v) => v.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized,
      ),
  );
  return found?.[0] ?? null;
}
