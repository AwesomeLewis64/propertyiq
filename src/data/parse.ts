import Papa from "papaparse";
import { normalizeTable, type RawTable, MAX_ROWS } from "./rentRoll";
export function parseCsv(text: string): RawTable {
  const result = Papa.parse<string[]>(text, {
    skipEmptyLines: "greedy",
    preview: MAX_ROWS + 2,
  });
  const fatal = result.errors.filter((e) => e.code !== "UndetectableDelimiter");
  if (fatal.length) throw new Error(`Malformed CSV: ${fatal[0].message}`);
  if (result.meta.truncated)
    throw new Error(`At most ${MAX_ROWS.toLocaleString()} rows are supported.`);
  return normalizeTable(result.data);
}
