import LoadingFeedback from "./LoadingFeedback";
import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, FileSpreadsheet, ShieldCheck } from "lucide-react";
import {
  aggregate,
  applyRentRoll,
  autoMapping,
  mapRows,
  MAX_BYTES,
  type Mapping,
  type RawTable,
} from "../data/rentRoll";
import { csvText, download } from "../data/export";
import type { Assumptions } from "../finance/types";
import { money, pct } from "./format";
const mappingLabels: Record<keyof Mapping, string> = {
  unit: "Unit identifier *",
  status: "Occupancy status *",
  contract: "Monthly contract rent *",
  market: "Market rent (optional)",
  expiration: "Lease expiration (optional)",
};
export default function ImportRentRoll({
  a,
  onApply,
}: {
  a: Assumptions;
  onApply: (a: Assumptions) => void;
}) {
  const [file, setFile] = useState<File | null>(null),
    [sheet, setSheet] = useState(1),
    [sheets, setSheets] = useState<string[]>([]),
    [raw, setRaw] = useState<RawTable | null>(null),
    [mapping, setMapping] = useState<Mapping>({
      unit: -1,
      status: -1,
      contract: -1,
      market: -1,
      expiration: -1,
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [page, setPage] = useState(0),
    [applied, setApplied] = useState(false);
  const active = useRef<Worker | null>(null);
  useEffect(() => () => active.current?.terminate(), []);
  function load(next: File, sheetNumber = 1) {
    active.current?.terminate();
    if (next !== file) setSheets([]);
    setFile(next);
    setSheet(sheetNumber);
    setRaw(null);
    setError("");
    setApplied(false);
    setPage(0);
    if (next.size > MAX_BYTES) {
      setBusy(false);
      setError("File limit is 5 MB.");
      return;
    }
    if (!/\.(csv|xlsx)$/i.test(next.name)) {
      setBusy(false);
      setError("Choose a CSV or XLSX file.");
      return;
    }
    setBusy(true);
    const worker = new Worker(
      new URL("../data/import.worker.ts", import.meta.url),
      { type: "module" },
    );
    active.current = worker;
    const timeout = setTimeout(() => {
      worker.terminate();
      if (active.current === worker) {
        setBusy(false);
        setError(
          "Parsing exceeded 15 seconds. Try a smaller or simpler workbook.",
        );
      }
    }, 15000);
    worker.onmessage = (event) => {
      clearTimeout(timeout);
      worker.terminate();
      if (active.current !== worker) return;
      setBusy(false);
      if (event.data.sheets?.length) setSheets(event.data.sheets);
      if (event.data.error) setError(event.data.error);
      else {
        setRaw(event.data.raw);
        setMapping(autoMapping(event.data.raw.headers));
        setSheets(event.data.sheets);
      }
    };
    worker.onerror = () => {
      clearTimeout(timeout);
      worker.terminate();
      if (active.current === worker) {
        setBusy(false);
        setError("Unable to parse this file. Check the format and try again.");
      }
    };
    worker.postMessage({ file: next, sheet: sheetNumber });
  }
  const review = useMemo(() => {
    if (!raw) return { rows: [], error: "" };
    try {
      return { rows: mapRows(raw, mapping), error: "" };
    } catch (e) {
      return { rows: [], error: (e as Error).message };
    }
  }, [raw, mapping]);
  const summary = useMemo(() => aggregate(review.rows), [review.rows]);
  const rejected = review.rows.filter((r) => r.errors.length > 0),
    duplicates = review.rows.filter((r) => r.duplicate);
  return (
    <>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Rent-roll import</h2>
            <p>
              CSV / XLSX · up to 5 MB, 5,000 rows and 64 columns · header in the
              first row
            </p>
          </div>
          <span className="badge">100% local</span>
        </div>
        <div className="import-body">
          <div className="upload-box">
            <FileSpreadsheet size={31} />
            <h3>Bring your rent roll into the model.</h3>
            <p>
              Include unit ID, occupied/vacant status, and monthly contract
              rent.
              <br />
              Do not include tenant names or personal contact details.
            </p>
            <label className="button primary upload-label">
              <Upload size={16} />
              Choose CSV or XLSX
              <input
                type="file"
                aria-label="Upload rent roll"
                disabled={busy}
                aria-busy={busy}
                accept=".csv,.xlsx"
                onChange={(e) => {
                  const next = e.target.files?.[0];
                  if (next) load(next);
                  e.target.value = "";
                }}
              />
            </label>
            <span>
              <ShieldCheck size={12} />
              Files never leave your browser
            </span>
          </div>
          <div className="import-samples">
            <a href="/samples/rent-roll.csv" download>
              Download sample CSV
            </a>
            <a href="/samples/rent-roll.xlsx" download>
              Download sample XLSX
            </a>
          </div>
          {busy && (
            <LoadingFeedback
              label={`Reading ${file?.name ?? "rent roll"}…`}
              skeleton
            />
          )}
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          {file && sheets.length > 0 && (
            <div className="import-file">
              <strong>{file?.name}</strong>
              <span>
                {raw
                  ? `${raw.rows.length.toLocaleString()} rows detected`
                  : "Select a worksheet to review"}
              </span>
              {sheets.length > 1 && (
                <label>
                  Worksheet{" "}
                  <select
                    aria-label="Import worksheet"
                    disabled={busy}
                    value={sheet}
                    onChange={(e) => file && load(file, Number(e.target.value))}
                  >
                    {sheets.map((s, i) => (
                      <option key={s} value={i + 1}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          {raw && (
            <>
              <div className="mapping-grid">
                {(Object.keys(mappingLabels) as (keyof Mapping)[]).map(
                  (key) => (
                    <label className="field" key={key}>
                      <span>{mappingLabels[key]}</span>
                      <select
                        aria-label={mappingLabels[key]}
                        value={mapping[key]}
                        onChange={(e) => {
                          setMapping({
                            ...mapping,
                            [key]: Number(e.target.value),
                          });
                          setApplied(false);
                          setPage(0);
                        }}
                      >
                        <option value={-1}>
                          {["market", "expiration"].includes(key)
                            ? "Not provided"
                            : "Choose column"}
                        </option>
                        {raw.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </label>
                  ),
                )}
              </div>
              {review.error && (
                <div className="alert" role="status">
                  {review.error}
                </div>
              )}
              {rejected.length > 0 || duplicates.length > 0 ? (
                <div className="alert" role="status">
                  {rejected.length} rejected rows · {duplicates.length} rows
                  with duplicate unit IDs. No rows are deleted automatically.
                  Correct the source spreadsheet and upload again before
                  applying.{" "}
                  <button
                    className="text-button"
                    onClick={() =>
                      download(
                        "propertyiq-import-issues.csv",
                        csvText([
                          ["Source row", "Unit ID", "Issues"],
                          ...review.rows
                            .filter((r) => r.errors.length || r.duplicate)
                            .map((r) => [
                              r.row,
                              r.unit,
                              [
                                ...r.errors,
                                ...(r.duplicate ? ["Duplicate unit ID"] : []),
                              ].join(" "),
                            ]),
                        ]),
                      )
                    }
                  >
                    Download all issues
                  </button>
                </div>
              ) : null}
              {summary && (
                <>
                  <div className="rentroll-metrics">
                    {[
                      ["Total units", summary.units.toLocaleString()],
                      [
                        "Occupied / vacant",
                        `${summary.occupied} / ${summary.vacant}`,
                      ],
                      ["Physical occupancy", pct(summary.occupancy)],
                      ["Occupied monthly rent", money(summary.monthlyContract)],
                      ["Annual occupied rent", money(summary.annualContract)],
                      ["Average occupied rent", money(summary.averageOccupied)],
                      ["Average market rent", money(summary.averageMarket)],
                      ["Annual market potential", money(summary.annualMarket)],
                      [
                        "Market potential − current rent",
                        money(summary.marketGap),
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  {summary.annualMarket === null && (
                    <p className="import-explanation">
                      Market metrics are N/A unless every unit has a valid
                      market rent. The market gap includes vacancy and
                      loss-to-lease; it is not an estimate of recoverable rent
                      increases.
                    </p>
                  )}
                  <div className="apply-roll">
                    <div>
                      <strong>Apply to current rent-roll performance</strong>
                      <p>
                        This replaces the analysis unit count and occupied
                        monthly rent. Physical vacancy is already reflected.
                        Growth, credit loss, concessions, financing and expenses
                        remain editable.
                      </p>
                    </div>
                    <button
                      className="button primary"
                      onClick={() => {
                        onApply(applyRentRoll(a, summary));
                        setApplied(true);
                      }}
                    >
                      Apply Rent Roll to Analysis
                    </button>
                  </div>
                </>
              )}
              {applied && (
                <div className="notice" role="status">
                  Rent roll applied. The analysis now uses current occupied
                  contractual rents; physical vacancy is not deducted again.
                </div>
              )}
              {review.rows.length > 0 && (
                <>
                  <div className="table-scroll" tabIndex={0}>
                    <table>
                      <thead>
                        <tr>
                          {[
                            "Source row",
                            "Unit ID",
                            "Status",
                            "Contract rent",
                            "Market rent",
                            "Lease expiration",
                            "Review",
                          ].map((v) => (
                            <th key={v}>{v}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {review.rows
                          .slice(page * 50, (page + 1) * 50)
                          .map((r) => (
                            <tr key={r.row}>
                              <th>{r.row}</th>
                              <td>{r.unit || "—"}</td>
                              <td>{r.status ?? "N/A"}</td>
                              <td>{money(r.contract)}</td>
                              <td>{money(r.market)}</td>
                              <td>{r.expiration ?? "N/A"}</td>
                              <td
                                className={
                                  r.errors.length || r.duplicate
                                    ? "negative"
                                    : ""
                                }
                              >
                                {[
                                  ...r.errors,
                                  ...(r.duplicate ? ["Duplicate unit ID"] : []),
                                ].join(" ") || "Valid"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pagination">
                    <button
                      className="button small"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </button>
                    <span>
                      Rows {page * 50 + 1}–
                      {Math.min((page + 1) * 50, review.rows.length)} of{" "}
                      {review.rows.length}
                    </span>
                    <button
                      className="button small"
                      disabled={(page + 1) * 50 >= review.rows.length}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
