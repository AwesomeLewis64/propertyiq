import type { Assumptions } from "../finance/types";
export type Cell = string | number | boolean | Date | null;
export type RawTable = {
  headers: string[];
  rows: Cell[][];
  rowNumbers: number[];
};
export type Mapping = {
  unit: number;
  status: number;
  contract: number;
  market: number;
  expiration: number;
};
export type RentRow = {
  row: number;
  unit: string;
  status: "occupied" | "vacant" | null;
  contract: number | null;
  market: number | null;
  expiration: string | null;
  errors: string[];
  duplicate: boolean;
};
export type RentSummary = {
  units: number;
  occupied: number;
  vacant: number;
  occupancy: number;
  monthlyContract: number;
  annualContract: number;
  averageOccupied: number | null;
  averageMarket: number | null;
  annualMarket: number | null;
  marketGap: number | null;
};
export const MAX_BYTES = 5 * 1024 * 1024,
  MAX_ROWS = 5000,
  MAX_COLUMNS = 64;
export function workbookCells(matrix: unknown[][]): Cell[][] {
  return matrix.map((row) =>
    row.map((cell) => {
      if (cell == null) return null;
      if (
        cell instanceof Date ||
        typeof cell === "string" ||
        typeof cell === "number" ||
        typeof cell === "boolean"
      )
        return cell;
      throw new Error("Unsupported spreadsheet cell value.");
    }),
  );
}
export function normalizeTable(matrix: Cell[][]): RawTable {
  if (matrix.length < 2)
    throw new Error("Include a header row and at least one data row.");
  const headers = matrix[0].map((v) =>
    String(v ?? "")
      .trim()
      .replace(/^\uFEFF/, ""),
  );
  if (headers.length > MAX_COLUMNS)
    throw new Error(`At most ${MAX_COLUMNS} columns are supported.`);
  if (headers.some((v) => !v)) throw new Error("Every column needs a header.");
  if (new Set(headers.map((v) => v.toLowerCase())).size !== headers.length)
    throw new Error("Duplicate column headers must be renamed before import.");
  const rows: Cell[][] = [],
    rowNumbers: number[] = [];
  matrix.slice(1).forEach((row, i) => {
    if (row.some((v) => v !== null && String(v).trim() !== "")) {
      rows.push(row);
      rowNumbers.push(i + 2);
    }
  });
  if (!rows.length) throw new Error("The sheet has no nonempty data rows.");
  if (rows.length > MAX_ROWS)
    throw new Error(
      `At most ${MAX_ROWS.toLocaleString()} rent-roll rows are supported.`,
    );
  return { headers, rows, rowNumbers };
}
const aliases: Record<keyof Mapping, string[]> = {
  unit: ["unit", "unitid", "unitidentifier", "unitnumber", "apt", "apartment"],
  status: ["status", "occupancystatus", "occupancy"],
  contract: [
    "rent",
    "monthlyrent",
    "contractrent",
    "monthlycontractrent",
    "scheduledrent",
  ],
  market: ["market", "marketrent", "monthlymarketrent"],
  expiration: [
    "leaseexpiration",
    "leaseexpirationdate",
    "leaseend",
    "expiration",
  ],
};
export function autoMapping(headers: string[]): Mapping {
  return Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => [
      key,
      headers.findIndex((v) =>
        names.includes(v.toLowerCase().replace(/[^a-z0-9]/g, "")),
      ),
    ]),
  ) as Mapping;
}
export function parseAmount(v: Cell | undefined): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? v : null;
  if (typeof v !== "string" || !v.trim()) return null;
  const currency = v.trim().replace(/^\$/, "");
  if (currency.includes(",") && !/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(currency))
    return null;
  const s = currency.replace(/,/g, "");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function dateValue(v: Cell | undefined): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (v instanceof Date)
    return Number.isFinite(v.getTime()) ? v.toISOString().slice(0, 10) : null;
  if (typeof v !== "string") return null;
  const iso = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/),
    us = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!iso && !us) return null;
  const year = Number(iso?.[1] ?? us?.[3]),
    month = Number(iso?.[2] ?? us?.[1]),
    day = Number(iso?.[3] ?? us?.[2]);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
    ? d.toISOString().slice(0, 10)
    : null;
}
export function mapRows(raw: RawTable, map: Mapping): RentRow[] {
  const required = [map.unit, map.status, map.contract];
  if (required.some((v) => v < 0 || v >= raw.headers.length))
    throw new Error(
      "Map unit identifier, occupancy status and contractual rent.",
    );
  const used = Object.values(map).filter((v) => v >= 0);
  if (new Set(used).size !== used.length)
    throw new Error("Each field must use a different source column.");
  const rows = raw.rows.map((cells, i) => {
    const errors: string[] = [];
    const unit = String(cells[map.unit] ?? "").trim();
    if (!unit) errors.push("Missing unit identifier.");
    if (unit.length > 120)
      errors.push("Unit identifier exceeds 120 characters.");
    const statusText = String(cells[map.status] ?? "")
      .trim()
      .toLowerCase();
    const status = ["occupied", "occ", "o", "leased", "rented"].includes(
      statusText,
    )
      ? "occupied"
      : ["vacant", "vac", "v", "unoccupied", "empty"].includes(statusText)
        ? "vacant"
        : null;
    if (status === null)
      errors.push("Status must identify occupied or vacant.");
    const contractRaw = cells[map.contract],
      contract = parseAmount(contractRaw);
    if (status === "occupied" && contract === null)
      errors.push("Occupied unit needs a nonnegative contractual rent.");
    if (
      status === "vacant" &&
      contractRaw !== null &&
      contractRaw !== undefined &&
      String(contractRaw).trim() !== "" &&
      contract === null
    )
      errors.push("Invalid contractual rent.");
    const marketRaw = map.market >= 0 ? cells[map.market] : null,
      market = parseAmount(marketRaw);
    if (
      marketRaw !== null &&
      marketRaw !== undefined &&
      String(marketRaw).trim() !== "" &&
      market === null
    )
      errors.push("Invalid market rent.");
    const expirationRaw = map.expiration >= 0 ? cells[map.expiration] : null,
      expiration = dateValue(expirationRaw);
    if (
      expirationRaw !== null &&
      expirationRaw !== undefined &&
      String(expirationRaw).trim() !== "" &&
      expiration === null
    )
      errors.push(
        "Lease date must be valid YYYY-MM-DD, MM/DD/YYYY or an Excel date.",
      );
    if (
      cells.length > raw.headers.length &&
      cells.slice(raw.headers.length).some((v) => v !== null && v !== "")
    )
      errors.push("Too many cells for the header row.");
    return {
      row: raw.rowNumbers[i],
      unit,
      status,
      contract: status === "vacant" ? (contract ?? 0) : contract,
      market,
      expiration,
      errors,
      duplicate: false,
    } satisfies RentRow;
  });
  const counts = new Map<string, number>();
  rows.forEach((r) => {
    const id = r.unit.toLowerCase();
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  });
  return rows.map((r) => ({
    ...r,
    duplicate: r.unit !== "" && (counts.get(r.unit.toLowerCase()) ?? 0) > 1,
  }));
}
export function aggregate(rows: RentRow[]): RentSummary | null {
  if (!rows.length || rows.some((r) => r.errors.length > 0 || r.duplicate))
    return null;
  const units = rows.length,
    occupied = rows.filter((r) => r.status === "occupied").length;
  const monthlyContract = rows
    .filter((r) => r.status === "occupied")
    .reduce((s, r) => s + r.contract!, 0);
  const completeMarket = rows.every((r) => r.market !== null),
    monthlyMarket = completeMarket
      ? rows.reduce((s, r) => s + r.market!, 0)
      : null;
  return {
    units,
    occupied,
    vacant: units - occupied,
    occupancy: occupied / units,
    monthlyContract,
    annualContract: monthlyContract * 12,
    averageOccupied: occupied > 0 ? monthlyContract / occupied : null,
    averageMarket: monthlyMarket !== null ? monthlyMarket / units : null,
    annualMarket: monthlyMarket !== null ? monthlyMarket * 12 : null,
    marketGap:
      monthlyMarket !== null ? monthlyMarket * 12 - monthlyContract * 12 : null,
  };
}
export function applyRentRoll(a: Assumptions, s: RentSummary): Assumptions {
  return {
    ...a,
    units: s.units,
    mode: "rentRoll",
    occupiedMonthlyRent: s.monthlyContract,
  };
}
export function checkXlsxArchive(buffer: ArrayBuffer): void {
  const view = new DataView(buffer);
  let end = -1;
  for (
    let i = buffer.byteLength - 22;
    i >= Math.max(0, buffer.byteLength - 65557);
    i--
  )
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw new Error("The XLSX file is not a valid ZIP archive.");
  const entries = view.getUint16(end + 10, true),
    offset = view.getUint32(end + 16, true);
  let cursor = offset,
    total = 0;
  if (entries > 512 || entries === 65535)
    throw new Error("This workbook exceeds supported archive limits.");
  for (let i = 0; i < entries; i++) {
    if (
      cursor + 46 > buffer.byteLength ||
      view.getUint32(cursor, true) !== 0x02014b50
    )
      throw new Error("Malformed XLSX archive directory.");
    total += view.getUint32(cursor + 24, true);
    if (total > 25 * 1024 * 1024)
      throw new Error("Expanded XLSX data exceeds 25 MB.");
    if (view.getUint16(cursor + 8, true) & 1)
      throw new Error("Encrypted spreadsheets are not supported.");
    cursor +=
      46 +
      view.getUint16(cursor + 28, true) +
      view.getUint16(cursor + 30, true) +
      view.getUint16(cursor + 32, true);
  }
}
