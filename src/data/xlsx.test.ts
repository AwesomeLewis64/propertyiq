import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import readXlsxFile from "read-excel-file/node";
import {
  aggregate,
  autoMapping,
  checkXlsxArchive,
  mapRows,
  normalizeTable,
  workbookCells,
  parseAmount,
} from "./rentRoll";
import { prepareXlsx } from "./xlsx";
describe("Real XLSX fixture integration", () => {
  it("reads a workbook with multiple sheets through the actual library and validates its archive", async () => {
    const buffer = await readFile(
      new URL("../../public/samples/rent-roll.xlsx", import.meta.url),
    );
    checkXlsxArchive(
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer,
    );
    const normalized = prepareXlsx(
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer,
    );
    const workbook = await readXlsxFile(Buffer.from(normalized));
    expect(workbook.map((s) => s.sheet)).toEqual(["Rent Roll", "Read me"]);
    const raw = normalizeTable(workbookCells(workbook[0].data));
    const summary = aggregate(mapRows(raw, autoMapping(raw.headers)))!;
    expect(summary.units).toBe(10);
    expect(summary.occupied).toBe(8);
    expect(summary.monthlyContract).toBe(12200);
    expect(summary.annualMarket).toBe(192000);
    expect(summary.marketGap).toBe(45600);
  });
  it("rejects ambiguous currency separators rather than misreading decimal commas", () =>
    expect(parseAmount("1,50")).toBeNull());
});
