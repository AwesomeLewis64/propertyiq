import LoadingFeedback from "../ui/LoadingFeedback";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  NumberField,
  TextField,
  Select,
  Toggle,
  Metric,
} from "./Controls";
import type { ProjectEditor } from "./UnitEditor";
import type { RawTable } from "../data/rentRoll";
import { toolsFor, type Detail } from "./toolSchema";
import { unitMonth, forecast } from "./engine";
import { uid } from "./defaults";
import { money, pct } from "../ui/format";
import { csvText, download } from "../data/export";
import { storedNumber } from "./benchmark";
export default function OperatingDetailPanel({ p, set }: ProjectEditor) {
  const t = toolsFor(p),
    [month, setMonth] = useState(p.startDate.slice(0, 7)),
    [complete, setComplete] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const latest = useRef(p),
    workerRef = useRef<Worker | null>(null),
    timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    latest.current = p;
  }, [p]);
  useEffect(
    () => () => {
      workerRef.current?.terminate();
      clearTimeout(timeoutRef.current);
    },
    [],
  );
  const records = t.details.filter((d) => d.month === month);
  const budget = useMemo(() => forecast({ ...p, actuals: [] }), [p]);
  const row = budget.rows.find((r) => r.date.startsWith(month));
  const rent = records
      .filter((d) => d.kind === "rent")
      .reduce((s, d) => s + d.amount, 0),
    other = records
      .filter((d) => d.kind === "otherIncome")
      .reduce((s, d) => s + d.amount, 0),
    expense = records
      .filter((d) => d.kind === "expense")
      .reduce((s, d) => s + d.amount, 0);
  const plannedRent = row ? row.rent - row.concessions - row.creditLoss : 0;
  const patch = (id: string, v: Partial<Detail>) =>
    set({
      ...p,
      tools: {
        ...t,
        details: t.details.map((d) => (d.id === id ? { ...d, ...v } : d)),
      },
    });
  const add = () =>
    set({
      ...p,
      tools: {
        ...t,
        details: [
          ...t.details,
          {
            id: uid(),
            month,
            kind: "expense",
            unit: "",
            category: "",
            amount: 0,
            source: "",
          },
        ],
      },
    });
  const post = () => {
    const old = p.actuals.find((a) => a.month === month);
    set({
      ...p,
      actuals: [
        ...p.actuals.filter((a) => a.month !== month),
        {
          month,
          rent,
          otherIncome: other,
          opex: expense,
          capex: old?.capex ?? row?.capex ?? 0,
          debtService: old?.debtService ?? row?.debtService ?? 0,
        },
      ].sort((a, b) => a.month.localeCompare(b.month)),
    });
    setNotice(
      "Posted income and operating expenses. Existing monthly CapEx and debt amounts were preserved; missing values use the plan and need separate reconciliation.",
    );
  };
  const upload = (file: File) => {
    workerRef.current?.terminate();
    clearTimeout(timeoutRef.current);
    setError("");
    setNotice("");
    setBusy(true);
    const worker = new Worker(
      new URL("../data/import.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    const timeout = (timeoutRef.current = setTimeout(() => {
      worker.terminate();
      setError("Import timed out.");
      setNotice("");
      setBusy(false);
    }, 15000));
    worker.onerror = () => {
      clearTimeout(timeout);
      setError("Unable to read detail file.");
      setNotice("");
      setBusy(false);
      worker.terminate();
    };
    worker.onmessage = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      setNotice("");
      setBusy(false);
      try {
        if (e.data.error) throw new Error(e.data.error);
        const raw = e.data.raw as RawTable;
        const headers = raw.headers.map((h) =>
          h.toLowerCase().replace(/[^a-z]/g, ""),
        );
        for (const k of ["month", "kind", "amount"])
          if (!headers.includes(k)) throw new Error(`Required column: ${k}.`);
        const details = raw.rows.map((r, i) => {
          const at = (k: string) => r[headers.indexOf(k)] ?? "";
          const kind = String(at("kind"));
          if (
            !["rent", "otherIncome", "expense"].includes(kind) ||
            !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(at("month")))
          )
            throw new Error(
              `Row ${i + 2}: use YYYY-MM and rent / otherIncome / expense.`,
            );
          const amount = storedNumber(at("amount"));
          if (amount < 0)
            throw new Error(`Row ${i + 2}: use positive gross amounts.`);
          return {
            id: uid(),
            month: String(at("month")),
            kind: kind as Detail["kind"],
            unit: String(at("unit")),
            category: String(at("category")),
            amount,
            source: String(at("source")) || file.name,
          };
        });
        const current = latest.current,
          tools = toolsFor(current);
        if (tools.details.length + details.length > 5000)
          throw new Error("Maximum 5,000 operating detail rows.");
        set({
          ...current,
          tools: { ...tools, details: [...tools.details, ...details] },
        });
        setNotice(
          `Added ${details.length} detail rows. Review and explicitly post complete months.`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid detail import.");
      }
    };
    worker.postMessage({ file, sheet: 1 });
  };
  const categories = [
    ...new Set([
      ...p.expenses.map((e) => e.name),
      "Management",
      ...records.filter((r) => r.kind === "expense").map((r) => r.category),
    ]),
  ];
  return (
    <>
      <Card
        title="Detailed operating performance"
        note="Positive unit collections and categorized expense records. Imported detail is a review ledger until you explicitly post a complete month into Actuals."
      >
        <div className="adv-form">
          <TextField
            label="Detailed operating month YYYY-MM"
            value={month}
            onChange={(v) => {
              setMonth(v);
              setComplete(false);
            }}
          />
          <label className="adv-field">
            Import detail CSV / first XLSX worksheet
            <input
              type="file"
              accept=".csv,.xlsx"
              aria-label="Operating detail upload"
              disabled={busy}
              aria-busy={busy}
              onChange={(e) => {
                if (e.target.files?.[0]) upload(e.target.files[0]);
              }}
            />
          </label>
        </div>
        <div className="adv-actions">
          <button
            className="button"
            disabled={t.details.length >= 5000}
            onClick={add}
          >
            Add operating record
          </button>
          <button
            className="button small"
            onClick={() =>
              download(
                "propertyiq-operating-detail-template.csv",
                csvText([
                  ["month", "kind", "unit", "category", "amount", "source"],
                  [
                    p.startDate.slice(0, 7),
                    "rent",
                    "1",
                    "Rent",
                    1000,
                    "Fictional example",
                  ],
                  [
                    p.startDate.slice(0, 7),
                    "expense",
                    "",
                    "Insurance",
                    500,
                    "Fictional example",
                  ],
                ]),
              )
            }
          >
            Download detail template
          </button>
        </div>
        {error && <p className="alert error">{error}</p>}
        {busy && <LoadingFeedback label="Reading operating detail…" skeleton />}
        {notice && <p role="status">{notice}</p>}
        <div className="metrics adv-metrics">
          <Metric label="Recorded collections" value={money(rent)} />
          <Metric label="Recorded operating expenses" value={money(expense)} />
          <Metric label="Detailed NOI" value={money(rent + other - expense)} />
        </div>
        {records.map((d) => (
          <details className="adv-details" key={d.id}>
            <summary>
              {d.kind} · {d.unit || d.category || "Unclassified"} ·{" "}
              {money(d.amount)}
            </summary>
            <div className="adv-form">
              <Select
                label="Operating record kind"
                value={d.kind}
                onChange={(v) => patch(d.id, { kind: v as Detail["kind"] })}
                options={[
                  ["rent", "Unit collection"],
                  ["otherIncome", "Other income"],
                  ["expense", "Operating expense"],
                ]}
              />
              <TextField
                label="Operating record period"
                value={d.month}
                onChange={(v) => patch(d.id, { month: v })}
              />
              <TextField
                label="Operating record unit ID"
                value={d.unit}
                onChange={(v) => patch(d.id, { unit: v })}
              />
              <TextField
                label="Expense / income category"
                value={d.category}
                onChange={(v) => patch(d.id, { category: v })}
              />
              <NumberField
                label="Positive recorded amount"
                value={d.amount}
                onChange={(v) => patch(d.id, { amount: v })}
              />
              <TextField
                label="Operating source reference"
                value={d.source}
                onChange={(v) => patch(d.id, { source: v })}
              />
            </div>
            <button
              className="button small"
              onClick={() =>
                set({
                  ...p,
                  tools: {
                    ...t,
                    details: t.details.filter((x) => x.id !== d.id),
                  },
                })
              }
            >
              Remove operating record
            </button>
          </details>
        ))}
        <Toggle
          label="I have reviewed this as a complete income and operating expense statement"
          value={complete}
          onChange={setComplete}
        />
        <button
          className="button primary"
          disabled={
            !complete ||
            !records.length ||
            forecast(p).errors.length > 0 ||
            !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)
          }
          onClick={post}
        >
          Post this month's detailed income and expenses
        </button>
        <p>
          Posting replaces monthly rent, other income and operating expenses. It
          does not reconcile bank balances or actual loan principal. Rent
          records are collected amounts after any concessions and credit losses;
          do not enter scheduled gross rent as collected cash.
        </p>
      </Card>
      <Card title="NOI variance bridge">
        <div className="table-scroll" tabIndex={0}>
          <table>
            <tbody>
              <tr>
                <th>Planned NOI</th>
                <td>{money(row?.noi)}</td>
              </tr>
              <tr>
                <th>Collections versus planned net rent</th>
                <td>{money(row ? rent - plannedRent : null)}</td>
              </tr>
              <tr>
                <th>Other income difference</th>
                <td>{money(row ? other - row.other : null)}</td>
              </tr>
              <tr>
                <th>Operating expense effect</th>
                <td>{money(row ? row.expenses - expense : null)}</td>
              </tr>
              <tr>
                <th>Detailed actual NOI</th>
                <td>{money(rent + other - expense)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          The bridge separates income from expenses. Unit shortfalls can come
          from vacancy, concessions, bad debt or late payment; collection
          records alone cannot determine which cause applies.
        </p>
        <h3>Collections by unit</h3>
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Planned billed less concessions</th>
                <th>Collected</th>
                <th>Collection ratio</th>
              </tr>
            </thead>
            <tbody>
              {p.units.map((u) => {
                const expected = row ? unitMonth(u, row.month, p) : null;
                const billed = expected
                    ? expected.rent - expected.concession
                    : null,
                  actual = records
                    .filter((d) => d.kind === "rent" && d.unit === u.id)
                    .reduce((s, d) => s + d.amount, 0);
                return (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{money(billed)}</td>
                    <td>{money(actual)}</td>
                    <td>
                      {pct(billed && billed > 0 ? actual / billed : null)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <h3>Expenses by category</h3>
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Planned</th>
                <th>Recorded</th>
                <th>Recorded − planned</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((name) => {
                const planned = row
                  ? name === "Management"
                    ? Math.max(
                        0,
                        row.rent - row.concessions - row.creditLoss + row.other,
                      ) * p.management
                    : p.expenses
                        .filter(
                          (e) => e.name === name && row.month >= e.startMonth,
                        )
                        .reduce((s, e) => {
                          const changed =
                            e.changeMonth > 0 && row.month >= e.changeMonth;
                          return (
                            s +
                            ((changed ? e.replacementAnnual : e.annual) / 12) *
                              Math.pow(
                                1 + e.growth,
                                (row.month - (changed ? e.changeMonth : 1)) /
                                  12,
                              )
                          );
                        }, 0)
                  : null;
                const actual = records
                  .filter((d) => d.kind === "expense" && d.category === name)
                  .reduce((s, d) => s + d.amount, 0);
                return (
                  <tr key={name}>
                    <td>{name || "Unclassified"}</td>
                    <td>{money(planned)}</td>
                    <td>{money(actual)}</td>
                    <td>{money(planned === null ? null : actual - planned)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
