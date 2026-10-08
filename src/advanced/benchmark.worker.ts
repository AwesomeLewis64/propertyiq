import { parseCsv } from "../data/parse";
import { MAX_BYTES, MAX_COLUMNS, MAX_ROWS } from "../data/rentRoll";
const worker = globalThis as unknown as {
  onmessage: ((e: MessageEvent<{ file: File; sheet: number }>) => void) | null;
  postMessage: (value: unknown) => void;
};
worker.onmessage = async (e) => {
  let sheets: string[] = [];
  try {
    const { file, sheet } = e.data;
    if (file.size > MAX_BYTES) throw new Error("File limit is 5 MB.");
    let cells: unknown[][];
    if (/\.csv$/i.test(file.name)) {
      const raw = parseCsv(await file.text());
      cells = [raw.headers, ...raw.rows];
      sheets = ["CSV"];
    } else if (/\.xlsx$/i.test(file.name)) {
      const { prepareXlsx } = await import("../data/xlsx");
      const buffer = prepareXlsx(await file.arrayBuffer());
      const { default: read } = await import("read-excel-file/web-worker");
      const workbook = await read(buffer);
      sheets = workbook.map((s) => s.sheet);
      if (!workbook[sheet - 1]) throw new Error("Worksheet unavailable.");
      cells = workbook[sheet - 1].data;
    } else throw new Error("Choose CSV or XLSX.");
    if (cells.length > MAX_ROWS || cells.some((r) => r.length > MAX_COLUMNS))
      throw new Error("Maximum 5,000 rows and 64 columns.");
    worker.postMessage({
      sheets,
      cells: cells.map((r) =>
        r.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c)),
      ),
    });
  } catch (error) {
    worker.postMessage({
      sheets,
      error:
        error instanceof Error ? error.message : "Unable to read workbook.",
    });
  }
};
