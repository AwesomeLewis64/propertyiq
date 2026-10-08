import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import { checkXlsxArchive } from "./rentRoll";
// Some writers (including openpyxl) emit an empty inlineStr cell without <is>.
// read-excel-file rejects that representation. Remove only truly empty cells;
// cell coordinates keep surrounding columns intact and no data is fabricated.
export function prepareXlsx(buffer: ArrayBuffer): ArrayBuffer {
  checkXlsxArchive(buffer);
  const entries = unzipSync(new Uint8Array(buffer));
  let changed = false,
    total = 0;
  for (const [name, bytes] of Object.entries(entries)) {
    total += bytes.byteLength;
    if (total > 25 * 1024 * 1024)
      throw new Error("Expanded XLSX data exceeds 25 MB.");
    if (/^xl\/worksheets\/[^/]+\.xml$/.test(name)) {
      const xml = strFromU8(bytes);
      const normalized = xml
        .replace(/<c\b[^>]*\bt=["']inlineStr["'][^>]*>\s*<\/c>/g, "")
        .replace(/<c\b[^>]*\bt=["']inlineStr["'][^>]*\/>/g, "");
      if (normalized !== xml) {
        entries[name] = strToU8(normalized);
        changed = true;
      }
    }
  }
  if (!changed) return buffer;
  const zipped = zipSync(entries);
  return zipped.buffer.slice(
    zipped.byteOffset,
    zipped.byteOffset + zipped.byteLength,
  ) as ArrayBuffer;
}
