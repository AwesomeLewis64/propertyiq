import { parseCsv } from "./parse";
import { normalizeTable, workbookCells, MAX_BYTES } from "./rentRoll";
const worker = globalThis as unknown as {
  onmessage:
    | ((event: MessageEvent<{ file: File; sheet: number }>) => void)
    | null;
  postMessage: (data: unknown) => void;
};
worker.onmessage = async (event) => {
  let knownSheets: string[] = [];
  try {
    const { file, sheet } = event.data;
    if (file.size > MAX_BYTES) throw new Error("File limit is 5 MB.");
    if (/\.csv$/i.test(file.name))
      worker.postMessage({ raw: parseCsv(await file.text()), sheets: ["CSV"] });
    else if (/\.xlsx$/i.test(file.name)) {
      const { prepareXlsx } = await import("./xlsx");
      const buffer = prepareXlsx(await file.arrayBuffer());
      const { default: readXlsxFile } = await import(
        "read-excel-file/web-worker"
      );
      const workbook = await readXlsxFile(buffer);
      const sheets = workbook.map((s) => s.sheet);
      knownSheets = sheets;
      const selected = workbook[sheet - 1];
      if (!selected) throw new Error("The selected worksheet is unavailable.");
      worker.postMessage({
        raw: normalizeTable(workbookCells(selected.data)),
        sheets,
      });
    } else throw new Error("Choose a CSV or XLSX file.");
  } catch (error) {
    worker.postMessage({
      error:
        error instanceof Error ? error.message : "Unable to read this file.",
      sheets: knownSheets,
    });
  }
};
