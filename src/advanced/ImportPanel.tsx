import { useEffect, useMemo, useRef, useState } from "react";
import type { RawTable } from "../data/rentRoll";
import type { ProjectEditor } from "./UnitEditor";
import {
  applyTable,
  fields,
  mapDefault,
  required,
  type ImportKind,
  type MapColumns,
} from "./import";
import { checkProject, saveAttachment } from "./store";
import { Card, Select } from "./Controls";
import { uid } from "./defaults";
import { csvText, download } from "../data/export";
export default function ImportPanel({
  p,
  set,
  initialFile,
}: ProjectEditor & { initialFile?: File }) {
  const [kind, setKind] = useState<ImportKind>("units"),
    [raw, setRaw] = useState<RawTable | null>(null),
    [mapping, setMapping] = useState<MapColumns>({}),
    [file, setFile] = useState<File | null>(initialFile ?? null),
    [sheet, setSheet] = useState(1),
    [sheets, setSheets] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const request = useRef(0);
  const latest = useRef(p);
  useEffect(() => {
    latest.current = p;
  }, [p]);
  useEffect(() => {
    if (!file) return;
    const version = ++request.current;
    setBusy(true);
    setError("");
    setRaw(null);
    const worker = new Worker(
      new URL("../data/import.worker.ts", import.meta.url),
      { type: "module" },
    );
    const timeout = setTimeout(() => {
      worker.terminate();
      if (version === request.current) {
        setError("Parsing timed out. Use a smaller workbook.");
        setBusy(false);
      }
    }, 15000);
    worker.onmessage = (e) => {
      if (version !== request.current) return;
      clearTimeout(timeout);
      setBusy(false);
      setSheets(e.data.sheets ?? []);
      if (e.data.error) setError(e.data.error);
      else setRaw(e.data.raw);
      worker.terminate();
    };
    worker.onerror = () => {
      clearTimeout(timeout);
      setBusy(false);
      setError("Unable to parse this file.");
      worker.terminate();
    };
    worker.postMessage({ file, sheet });
    return () => {
      clearTimeout(timeout);
      worker.terminate();
    };
  }, [file, sheet]);
  useEffect(() => {
    if (raw) setMapping(mapDefault(raw.headers, kind));
  }, [raw, kind]);
  const candidate = useMemo(() => {
    if (!raw) return { project: null, error: "" };
    try {
      return {
        project: checkProject(applyTable(p, raw, kind, mapping)),
        error: "",
      };
    } catch (e) {
      return {
        project: null,
        error: e instanceof Error ? e.message : "Invalid import.",
      };
    }
  }, [p, raw, kind, mapping]);
  const apply = async () => {
    if (!candidate.project || !file) return;
    if (!raw) return;
    try {
      const id = uid();
      await saveAttachment(id, file);
      const applied = checkProject(
        applyTable(latest.current, raw, kind, mapping),
      );
      set({
        ...applied,
        evidence: [
          ...applied.evidence,
          {
            id: uid(),
            type: "other",
            title: `Imported ${kind}: ${file.name}`,
            source: file.name,
            date: new Date().toISOString().slice(0, 10),
            status: "unverified",
            value: raw?.rows.length ?? 0,
            note: `Mapped worksheet ${sheets[sheet - 1] ?? "CSV"}; ${raw?.rows.length} rows. Source file preserved locally.`,
            attachmentId: id,
          },
        ],
      });
      setNotice(
        "Applied mapped rows. Source file is attached in Diligence; save a file backup to preserve it outside this browser.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    }
  };
  return (
    <>
      <Card
        title="Workbook and statement imports"
        note="CSV and XLSX; each worksheet is explicitly mapped and applied. Files stay local. Stored formula values are read without recalculation."
      >
        <div className="adv-form">
          <Select
            label="Import destination"
            value={kind}
            onChange={(v) => setKind(v as ImportKind)}
            options={[
              ["units", "Rent roll / unit schedules"],
              ["actuals", "Monthly financial statements / T12"],
              ["ledger", "Categorized general ledger"],
              ["expenses", "Expense assumptions"],
              ["budget", "Renovation / construction budget"],
              ["loans", "Lender quotes / debt terms"],
              ["historical", "Dated historical equity flows"],
              ["assumptions", "Underwriting assumptions (field / value)"],
            ]}
          />
          <label className="adv-field">
            <span>Upload CSV / XLSX</span>
            <input
              aria-label="Advanced spreadsheet upload"
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => {
                setSheet(1);
                setSheets([]);
                setNotice("");
                setFile(e.target.files?.[0] ?? null);
              }}
            />
          </label>
          {sheets.length > 1 && (
            <Select
              label="Worksheet to map"
              value={String(sheet)}
              onChange={(v) => setSheet(Number(v))}
              options={sheets.map((s, i) => [String(i + 1), s])}
            />
          )}
        </div>
        <button
          className="button small"
          onClick={() =>
            download(`propertyiq-${kind}-template.csv`, csvText([fields[kind]]))
          }
        >
          Download column template
        </button>
        <p>
          <a href="/samples/advanced-fictional-workbook.xlsx" download>
            Download fictional multi-sheet workbook
          </a>{" "}
          ·{" "}
          <a href="/samples/advanced-units.csv" download>
            Unit schedule CSV
          </a>{" "}
          ·{" "}
          <a href="/samples/advanced-monthly-actuals.csv" download>
            Monthly actuals CSV
          </a>
        </p>
        <p className="adv-muted">
          Percentages accept decimal fractions (0.06) or percent text (6%).
          Financial periods use YYYY-MM; dates use YYYY-MM-DD. Schedule months
          are counted from the forecast start. Mapping replaces the selected
          collection, preserving other project inputs.
        </p>
        {kind === "ledger" && (
          <p>
            Before importing a ledger, assign each row to rent, otherIncome,
            opex, capex or debtService and normalize amounts to positive gross
            receipts/outflows. This aggregates rows into monthly actuals; it
            does not infer accounting categories.
          </p>
        )}
        {kind === "units" && (
          <p>
            Occupied values: occupied/vacant, true/false or 1/0. Optional lease
            and renovation schedules become forecast inputs. Unit IDs must be
            unique. Missing market rents and future rent events are not
            invented. Vacant units without an availability month remain unleased
            through the modeled horizon; enter their market rents and
            availability before forecasting lease-up.
          </p>
        )}
        {kind === "assumptions" && (
          <p>
            Allowed fields: price, closing, initialCapex, openingCash,
            minimumCash, asOfEquity, rentGrowth, creditLoss, otherMonthly,
            management, reservesMonthly, contingency, exitCap, sellingCost,
            discount, months.
          </p>
        )}
        {busy && <p role="status">Reading spreadsheet in a local worker…</p>}
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="alert" role="status">
            {notice}
          </p>
        )}
        {raw && (
          <>
            <p>
              {raw.rows.length} source rows · {raw.headers.length} columns
            </p>
            <div className="adv-form">
              {fields[kind].map((key) => (
                <Select
                  key={key}
                  label={`${key}${required[kind].includes(key) ? " *" : ""}`}
                  value={String(mapping[key] ?? -1)}
                  onChange={(v) => setMapping({ ...mapping, [key]: Number(v) })}
                  options={[
                    ["-1", "Not mapped"],
                    ...raw.headers.map(
                      (h, i) => [String(i), h] as [string, string],
                    ),
                  ]}
                />
              ))}
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {raw.headers.map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {raw.rows.slice(0, 8).map((r, i) => (
                    <tr key={i}>
                      {raw.headers.map((_, j) => (
                        <td key={j}>{String(r[j] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {candidate.error ? (
              <p className="alert error">{candidate.error}</p>
            ) : (
              <p className="alert">
                Mapping and project validation passed. Review the sample values
                before applying.
              </p>
            )}
            <button
              className="button primary"
              disabled={!candidate.project || busy}
              onClick={apply}
            >
              Apply mapped worksheet
            </button>
          </>
        )}
      </Card>
      <Card title="Full model backup import">
        <p>
          A PropertyIQ workspace JSON backup preserves complete model inputs,
          revision history and attached files. Use Portfolio to import or export
          it. An arbitrary Excel underwriting model must be mapped worksheet by
          worksheet; spreadsheet formulas and unknown financial conventions are
          not automatically translated.
        </p>
      </Card>
    </>
  );
}
