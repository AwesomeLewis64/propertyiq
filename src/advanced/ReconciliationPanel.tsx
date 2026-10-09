import LoadingFeedback, { BusyLabel } from "../ui/LoadingFeedback";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Card, Select, NumberField, TextField } from "./Controls";
import {
  toolsFor,
  metricLabels,
  type MetricKey,
  type Benchmark,
} from "./toolSchema";
import {
  cellIndex,
  columnLabel,
  storedNumber,
  metricKey,
  type StoredCell,
} from "./benchmark";
import type { ProjectEditor } from "./UnitEditor";
import { forecast } from "./engine";
import { metricValue } from "./decisionAnalytics";
import { saveAttachment } from "./store";
import { uid } from "./defaults";
import { money, pct, multiple } from "../ui/format";
import { csvText, download } from "../data/export";
const formatted = (key: MetricKey, value: number | null) =>
  key === "irr"
    ? pct(value)
    : key === "dscr" || key === "multiple"
      ? multiple(value)
      : money(value);
export default function ReconciliationPanel({ p, set }: ProjectEditor) {
  const t = toolsFor(p),
    f = useMemo(() => forecast(p), [p]);
  const [file, setFile] = useState<File | null>(null),
    [sheet, setSheet] = useState(1),
    [sheets, setSheets] = useState<string[]>([]),
    [cells, setCells] = useState<StoredCell[][]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [mode, setMode] = useState("cell"),
    [address, setAddress] = useState("B2"),
    [metric, setMetric] = useState<MetricKey>("noi"),
    [definition, setDefinition] = useState(""),
    [labelColumn, setLabelColumn] = useState("A"),
    [valueColumn, setValueColumn] = useState("B"),
    [first, setFirst] = useState(2);
  const latest = useRef(p);
  useEffect(() => {
    latest.current = p;
  }, [p]);
  useEffect(() => {
    if (!file) return;
    setBusy(true);
    setError("");
    setCells([]);
    const worker = new Worker(
      new URL("./benchmark.worker.ts", import.meta.url),
      { type: "module" },
    );
    const timeout = setTimeout(() => {
      worker.terminate();
      setBusy(false);
      setError("Workbook parsing timed out.");
    }, 15000);
    worker.onmessage = (e) => {
      clearTimeout(timeout);
      setBusy(false);
      setSheets(e.data.sheets ?? []);
      if (e.data.error) setError(e.data.error);
      else setCells(e.data.cells);
      worker.terminate();
    };
    worker.onerror = () => {
      clearTimeout(timeout);
      setBusy(false);
      setError("Workbook could not be parsed.");
      worker.terminate();
    };
    worker.postMessage({ file, sheet });
    return () => {
      clearTimeout(timeout);
      worker.terminate();
    };
  }, [file, sheet]);
  const mapping = useMemo(() => {
    try {
      if (!cells.length)
        return {
          items: [] as Omit<Benchmark, "attachmentId" | "evidenceId">[],
          error: "",
        };
      const items: Omit<Benchmark, "attachmentId" | "evidenceId">[] = [];
      if (mode === "cell") {
        const [r, c] = cellIndex(address);
        items.push({
          id: uid(),
          metric,
          value: storedNumber(cells[r]?.[c]),
          source: file?.name ?? "",
          locator: `${sheets[sheet - 1] ?? "CSV"}!${address.toUpperCase()}`,
          definition,
        });
      } else {
        const [, lc] = cellIndex(labelColumn + "1"),
          [, vc] = cellIndex(valueColumn + "1");
        if (
          lc === vc ||
          !Number.isInteger(first) ||
          first < 1 ||
          first > cells.length
        )
          throw new Error(
            "Choose distinct columns and a valid first data row.",
          );
        for (let i = first - 1; i < cells.length; i++) {
          const key = metricKey(cells[i][lc]);
          if (!key) continue;
          items.push({
            id: uid(),
            metric: key,
            value: storedNumber(cells[i][vc]),
            source: file?.name ?? "",
            locator: `${sheets[sheet - 1] ?? "CSV"}!${valueColumn.toUpperCase()}${i + 1}`,
            definition,
          });
        }
        if (!items.length)
          throw new Error(
            "No recognized metric labels. Use the column template or map individual cells.",
          );
      }
      return { items, error: "" };
    } catch (e) {
      return {
        items: [],
        error: e instanceof Error ? e.message : "Invalid mapping",
      };
    }
  }, [
    cells,
    mode,
    address,
    metric,
    definition,
    labelColumn,
    valueColumn,
    first,
    file,
    sheets,
    sheet,
  ]);
  const apply = async () => {
    if (!file || !mapping.items.length) return;
    setBusy(true);
    setError("");
    try {
      const attachmentId = uid(),
        evidenceId = uid();
      await saveAttachment(attachmentId, file);
      const current = latest.current,
        tools = toolsFor(current);
      set({
        ...current,
        tools: {
          ...tools,
          reconciliation: {
            ...tools.reconciliation,
            benchmarks: [
              ...tools.reconciliation.benchmarks,
              ...mapping.items.map((b) => ({ ...b, attachmentId, evidenceId })),
            ],
          },
        },
        evidence: [
          ...current.evidence,
          {
            id: evidenceId,
            type: "other",
            title: `Reconciliation: ${file.name}`,
            source: file.name,
            date: new Date().toISOString().slice(0, 10),
            status: "unverified",
            value: mapping.items.length,
            note: "Stored worksheet values; formulas not recalculated.",
            attachmentId,
          },
        ],
      });
      setNotice(
        `Saved ${mapping.items.length} mapped benchmarks and attached their workbook.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save benchmarks.");
    } finally {
      setBusy(false);
    }
  };
  const rows = t.reconciliation.benchmarks.map((b) => {
    const value = metricValue(p, f, b.metric),
      difference = value === null ? null : value - b.value;
    return { ...b, current: value, difference };
  });
  return (
    <>
      <Card
        title="Workbook reconciliation"
        note="Map stored spreadsheet values to specific model metrics. Matching values do not establish matching accounting definitions or timing."
      >
        <div className="adv-form">
          <NumberField
            label="Operating comparison start month"
            value={t.reconciliation.start}
            onChange={(v) =>
              set({
                ...p,
                tools: {
                  ...t,
                  reconciliation: { ...t.reconciliation, start: v },
                },
              })
            }
          />
          <NumberField
            label="Operating comparison period months"
            value={t.reconciliation.length}
            onChange={(v) =>
              set({
                ...p,
                tools: {
                  ...t,
                  reconciliation: { ...t.reconciliation, length: v },
                },
              })
            }
          />
          <NumberField
            label="Absolute comparison tolerance"
            value={t.reconciliation.tolerance}
            onChange={(v) =>
              set({
                ...p,
                tools: {
                  ...t,
                  reconciliation: { ...t.reconciliation, tolerance: v },
                },
              })
            }
          />
        </div>
        <p>
          NOI, scheduled debt and NOI DSCR use the selected forecast months,
          including posted actual overrides. Equity, funding, XIRR, NPV,
          multiple and exit value use the full model. XIRR is dated; a
          workbook's annual IRR is not directly equivalent. IRR benchmarks must
          be decimal fractions or percent text. Tolerance uses native metric
          units, so 0.01 means $0.01 for money and one percentage point for a
          decimal IRR.
        </p>
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                {[
                  "Metric",
                  "Workbook",
                  "PropertyIQ",
                  "Difference",
                  "Review",
                  "Source cell",
                  "Definition / period",
                ].map((v) => (
                  <th key={v}>{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{metricLabels[r.metric]}</td>
                  <td>{formatted(r.metric, r.value)}</td>
                  <td>{formatted(r.metric, r.current)}</td>
                  <td>{formatted(r.metric, r.difference)}</td>
                  <td>
                    {r.difference === null
                      ? "Unavailable"
                      : Math.abs(r.difference) <= t.reconciliation.tolerance
                        ? "Within tolerance"
                        : "Investigate"}
                  </td>
                  <td>
                    {r.source} · {r.locator}
                  </td>
                  <td>
                    {r.definition || "Definition not documented"}
                    <button
                      className="button small"
                      onClick={() =>
                        set({
                          ...p,
                          tools: {
                            ...t,
                            reconciliation: {
                              ...t.reconciliation,
                              benchmarks: t.reconciliation.benchmarks.filter(
                                (b) => b.id !== r.id,
                              ),
                            },
                          },
                        })
                      }
                    >
                      Remove benchmark
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p>
            No benchmarks supplied. Map your workbook below; no property figures
            are prefilled.
          </p>
        )}
        <button
          className="button"
          disabled={!rows.length}
          onClick={() =>
            download(
              "propertyiq-reconciliation.csv",
              csvText([
                [
                  "Metric",
                  "Workbook",
                  "PropertyIQ",
                  "Difference",
                  "Source",
                  "Cell",
                  "Definition",
                ],
                ...rows.map((r) => [
                  metricLabels[r.metric],
                  r.value,
                  r.current,
                  r.difference,
                  r.source,
                  r.locator,
                  r.definition,
                ]),
              ]),
            )
          }
        >
          Export reconciliation differences
        </button>
      </Card>
      <Card
        title="Map workbook cells or columns"
        note="XLSX cell addresses use the original worksheet grid. CSV addresses refer to the displayed normalized table, including its header row. Maximum 5 MB, 5,000 rows and 64 columns; no formula execution."
      >
        <div className="recon-starters">
          <button
            className="button small"
            onClick={() =>
              download(
                "propertyiq-benchmark-template.csv",
                csvText([
                  ["Metric", "Value", "Definition"],
                  ...Object.entries(metricLabels).map(([k, v]) => [k, "", v]),
                ]),
              )
            }
          >
            <Download size={14} aria-hidden="true" />
            Download benchmark column template
          </button>
          <a
            className="button small"
            href="/samples/reconciliation-fictional.csv"
            download
          >
            <Download size={14} aria-hidden="true" />
            Download fictional comparison example
          </a>
          <small>
            The example holds fictional figures for learning the mapping
            workflow.
          </small>
        </div>
        <div className="adv-form">
          <label className="adv-field">
            Workbook for comparison
            <input
              type="file"
              accept=".xlsx,.csv"
              aria-label="Reconciliation workbook upload"
              onChange={(e) => {
                setSheet(1);
                setFile(e.target.files?.[0] ?? null);
              }}
            />
          </label>
          {!!sheets.length && (
            <Select
              label="Benchmark worksheet"
              value={String(sheet)}
              onChange={(v) => setSheet(Number(v))}
              options={sheets.map((s, i) => [String(i + 1), s])}
            />
          )}
          <Select
            label="Benchmark mapping mode"
            value={mode}
            onChange={setMode}
            options={[
              ["cell", "Individual worksheet cell"],
              ["columns", "Metric-label and value columns"],
            ]}
          />
          {mode === "cell" ? (
            <>
              <TextField
                label="Stored benchmark cell"
                value={address}
                onChange={setAddress}
              />
              <Select
                label="Benchmark metric"
                value={metric}
                onChange={(v) => setMetric(v as MetricKey)}
                options={Object.entries(metricLabels)}
              />
            </>
          ) : (
            <>
              <TextField
                label="Metric label column"
                value={labelColumn}
                onChange={setLabelColumn}
              />
              <TextField
                label="Benchmark value column"
                value={valueColumn}
                onChange={setValueColumn}
              />
              <NumberField
                label="First benchmark data row"
                value={first}
                onChange={setFirst}
              />
            </>
          )}
          <TextField
            label="Workbook definition, date range and adjustments"
            value={definition}
            onChange={setDefinition}
          />
        </div>
        {busy && (
          <LoadingFeedback label="Reading or saving workbook…" skeleton />
        )}
        {error && <p className="alert error">{error}</p>}
        {mapping.error && <p className="alert error">{mapping.error}</p>}
        {notice && <p role="status">{notice}</p>}
        {!!cells.length && (
          <div className="table-scroll" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  {Array.from(
                    {
                      length: Math.min(
                        12,
                        Math.max(...cells.slice(0, 20).map((r) => r.length)),
                      ),
                    },
                    (_, i) => (
                      <th key={i}>{columnLabel(i)}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {cells.slice(0, 20).map((r, i) => (
                  <tr key={i}>
                    <th>{i + 1}</th>
                    {r.slice(0, 12).map((v, c) => (
                      <td key={c}>{String(v ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!!mapping.items.length && (
          <p>
            {mapping.items
              .map(
                (b) =>
                  `${metricLabels[b.metric]} = ${formatted(b.metric, b.value)} (${b.locator})`,
              )
              .join(" · ")}
          </p>
        )}
        <button
          className="button primary"
          disabled={busy || !mapping.items.length || !!f.errors.length}
          aria-busy={busy}
          onClick={() => void apply()}
        >
          {busy ? (
            <BusyLabel>Reading or saving…</BusyLabel>
          ) : (
            "Save mapped workbook benchmarks"
          )}
        </button>
      </Card>
    </>
  );
}
