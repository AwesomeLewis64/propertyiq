import MoneyInput from "../ui/MoneyInput";
import { useState } from "react";
import { Card, TextField, Select, Toggle } from "./Controls";
import type { ProjectEditor } from "./UnitEditor";
import { toolsFor, type Decision, type CaseRow } from "./toolSchema";
import { uid } from "./defaults";
import { money, pct } from "../ui/format";
import { download } from "../data/export";
function Nullable({
  label,
  value,
  change,
  currency = false,
}: {
  label: string;
  value: number | null;
  change: (v: number | null) => void;
  currency?: boolean;
}) {
  return (
    <label className="adv-field">
      <span>{label}</span>
      {currency ? (
        <MoneyInput
          value={value ?? NaN}
          onChange={(v) => change(Number.isFinite(v) ? v : null)}
        />
      ) : (
        <input
          type="number"
          step="any"
          value={value ?? ""}
          onChange={(e) =>
            change(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      )}
    </label>
  );
}
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const fmt = (r: CaseRow, v: number | null) =>
  v === null
    ? "Not supplied"
    : r.unit === "money"
      ? money(v)
      : r.unit === "percent"
        ? pct(v)
        : String(v);
export default function DecisionsPanel({ p, set }: ProjectEditor) {
  const t = toolsFor(p),
    [view, setView] = useState("decisions"),
    c = t.caseStudy;
  const patch = (id: string, part: Partial<Decision>) =>
    set({
      ...p,
      tools: {
        ...t,
        decisions: t.decisions.map((d) =>
          d.id === id ? { ...d, ...part } : d,
        ),
      },
    });
  const casePatch = (id: string, part: Partial<CaseRow>) =>
    set({
      ...p,
      tools: {
        ...t,
        caseStudy: {
          ...c,
          rows: c.rows.map((r) => (r.id === id ? { ...r, ...part } : r)),
        },
      },
    });
  const documented = c.rows.filter((r) => r.actual !== null),
    publicReady =
      documented.length > 0 &&
      documented.every((r) => r.verified && r.source.trim() && r.date);
  const exportStudy = () =>
    download(
      "propertyiq-property-case-study.md",
      `# ${c.title}\n\nAudience: ${c.audience}\nAs prepared: ${today()}\n\n${c.narrative}\n\n| Measure | Acquisition assumption | Recorded actual | Forecast | Source / date | Review |\n|---|---:|---:|---:|---|---|\n${c.rows.map((r) => `| ${r.label.replace(/\|/g, "/")} | ${fmt(r, r.acquisition)} | ${fmt(r, r.actual)} | ${fmt(r, r.forecast)} | ${r.source.replace(/\|/g, "/")} / ${r.date} | ${r.verified ? "User reviewed" : "Unverified"} |`).join("\n")}\n\n${c.rows
        .filter((r) => r.note)
        .map((r) => `- ${r.label}: ${r.note}`)
        .join(
          "\n",
        )}\n\nActuals are user-supplied records. Acquisition inputs and forecasts are assumptions, not achieved performance. Reviewed status is self-reported. Public export does not independently verify claims or publish anything.\n`,
      "text/markdown",
    );
  return (
    <>
      <Card title="Decisions, milestones and property case study">
        <Select
          label="Decision records view"
          value={view}
          onChange={setView}
          options={[
            ["decisions", "Decision and milestone log"],
            ["case", "Property case-study template"],
          ]}
        />
      </Card>
      {view === "decisions" ? (
        <Card
          title="Deal decisions and milestones"
          note="Record the reason for a decision, supporting evidence, conditions and eventual outcome. Milestone due dates also appear on the calendar."
        >
          <button
            className="button"
            onClick={() =>
              set({
                ...p,
                tools: {
                  ...t,
                  decisions: [
                    ...t.decisions,
                    {
                      id: uid(),
                      date: today(),
                      kind: "decision",
                      title: "New decision",
                      status: "pending",
                      owner: "",
                      due: "",
                      rationale: "",
                      outcome: "",
                      evidenceId: "",
                    },
                  ],
                },
              })
            }
          >
            Add decision or milestone
          </button>
          {!t.decisions.length && <p>No decisions recorded yet.</p>}
          {t.decisions.map((d) => (
            <details className="adv-details" key={d.id} open>
              <summary>
                {d.title} · {d.status}
              </summary>
              <div className="adv-form">
                <TextField
                  label="Decision / milestone title"
                  value={d.title}
                  onChange={(v) => patch(d.id, { title: v })}
                />
                <Select
                  label="Record type"
                  value={d.kind}
                  onChange={(v) => patch(d.id, { kind: v as Decision["kind"] })}
                  options={[
                    ["decision", "Decision"],
                    ["milestone", "Milestone / approval condition"],
                  ]}
                />
                <Select
                  label="Decision status"
                  value={d.status}
                  onChange={(v) =>
                    patch(d.id, { status: v as Decision["status"] })
                  }
                  options={[
                    ["pending", "Pending"],
                    ["pursue", "Pursue"],
                    ["pass", "Pass"],
                    ["complete", "Complete"],
                  ]}
                />
                <TextField
                  label="Recorded date"
                  type="date"
                  value={d.date}
                  onChange={(v) => patch(d.id, { date: v })}
                />
                <TextField
                  label="Decision owner"
                  value={d.owner}
                  onChange={(v) => patch(d.id, { owner: v })}
                />
                <TextField
                  label="Milestone due date"
                  type="date"
                  value={d.due}
                  onChange={(v) => patch(d.id, { due: v })}
                />
                <TextField
                  label="Reason, conditions and financing requirements"
                  value={d.rationale}
                  onChange={(v) => patch(d.id, { rationale: v })}
                />
                <TextField
                  label="Actual outcome and lessons"
                  value={d.outcome}
                  onChange={(v) => patch(d.id, { outcome: v })}
                />
                <Select
                  label="Decision supporting evidence"
                  value={d.evidenceId}
                  onChange={(v) => patch(d.id, { evidenceId: v })}
                  options={[
                    ["", "No evidence selected"],
                    ...p.evidence.map(
                      (e) => [e.id, e.title] as [string, string],
                    ),
                  ]}
                />
              </div>
              <button
                className="button small"
                onClick={() =>
                  set({
                    ...p,
                    tools: {
                      ...t,
                      decisions: t.decisions.filter((x) => x.id !== d.id),
                    },
                  })
                }
              >
                Remove decision record
              </button>
            </details>
          ))}
        </Card>
      ) : (
        <Card
          title="Property case-study template"
          note="Blank by default. Keep acquisition assumptions, recorded actuals and forecasts separate."
        >
          <div className="adv-form">
            <TextField
              label="Case-study title"
              value={c.title}
              onChange={(v) =>
                set({ ...p, tools: { ...t, caseStudy: { ...c, title: v } } })
              }
            />
            <Select
              label="Case-study intended audience"
              value={c.audience}
              onChange={(v) =>
                set({
                  ...p,
                  tools: {
                    ...t,
                    caseStudy: { ...c, audience: v as typeof c.audience },
                  },
                })
              }
              options={[
                ["internal", "Internal analysis"],
                ["public", "Public / portfolio draft"],
              ]}
            />
            <TextField
              label="Property story and scope of your work"
              value={c.narrative}
              onChange={(v) =>
                set({
                  ...p,
                  tools: { ...t, caseStudy: { ...c, narrative: v } },
                })
              }
            />
          </div>
          <div className="table-scroll" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th>Measure</th>
                  <th>Acquisition assumption</th>
                  <th>Recorded actual</th>
                  <th>Forecast</th>
                  <th>Source / date</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {c.rows.map((r) => (
                  <tr key={r.id}>
                    <th>{r.label}</th>
                    <td>{fmt(r, r.acquisition)}</td>
                    <td>{fmt(r, r.actual)}</td>
                    <td>{fmt(r, r.forecast)}</td>
                    <td>
                      {r.source || "Missing source"} · {r.date || "undated"}
                    </td>
                    <td>{r.verified ? "User reviewed" : "Unverified"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {c.rows.map((r) => (
            <details className="adv-details" key={r.id}>
              <summary>Edit {r.label}</summary>
              <div className="adv-form">
                <TextField
                  label="Case-study measure"
                  value={r.label}
                  onChange={(v) => casePatch(r.id, { label: v })}
                />
                <Select
                  label="Measure format"
                  value={r.unit}
                  onChange={(v) =>
                    casePatch(r.id, { unit: v as CaseRow["unit"] })
                  }
                  options={[
                    ["money", "Currency"],
                    ["percent", "Percentage (decimal fraction)"],
                    ["number", "Number / ratio"],
                  ]}
                />
                <Nullable
                  currency={r.unit === "money"}
                  label="Acquisition assumption value"
                  value={r.acquisition}
                  change={(v) => casePatch(r.id, { acquisition: v })}
                />
                <Nullable
                  currency={r.unit === "money"}
                  label="Recorded actual value"
                  value={r.actual}
                  change={(v) => casePatch(r.id, { actual: v })}
                />
                <Nullable
                  currency={r.unit === "money"}
                  label="Forecast value"
                  value={r.forecast}
                  change={(v) => casePatch(r.id, { forecast: v })}
                />
                <TextField
                  label="Actual source document and reference"
                  value={r.source}
                  onChange={(v) => casePatch(r.id, { source: v })}
                />
                <TextField
                  label="Actual as-of date"
                  type="date"
                  value={r.date}
                  onChange={(v) => casePatch(r.id, { date: v })}
                />
                <TextField
                  label="Measure definitions and qualifications"
                  value={r.note}
                  onChange={(v) => casePatch(r.id, { note: v })}
                />
                <Toggle
                  label="I reviewed the actual against its source"
                  value={r.verified}
                  onChange={(v) => casePatch(r.id, { verified: v })}
                />
              </div>
              <button
                className="button small"
                onClick={() =>
                  set({
                    ...p,
                    tools: {
                      ...t,
                      caseStudy: {
                        ...c,
                        rows: c.rows.filter((x) => x.id !== r.id),
                      },
                    },
                  })
                }
              >
                Remove case-study measure
              </button>
            </details>
          ))}
          <div className="adv-actions">
            <button
              className="button"
              onClick={() =>
                set({
                  ...p,
                  tools: {
                    ...t,
                    caseStudy: {
                      ...c,
                      rows: [
                        ...c.rows,
                        {
                          id: uid(),
                          label: "New measure",
                          acquisition: null,
                          actual: null,
                          forecast: null,
                          unit: "money",
                          source: "",
                          date: "",
                          verified: false,
                          note: "",
                        },
                      ],
                    },
                  },
                })
              }
            >
              Add case-study measure
            </button>
            <button
              className="button primary"
              disabled={c.audience === "public" && !publicReady}
              onClick={exportStudy}
            >
              Export case-study draft
            </button>
          </div>
          {c.audience === "public" && !publicReady && (
            <p className="alert">
              Public-draft export requires at least one actual figure and a
              source, date and user review for every supplied actual. This does
              not independently establish the truth of a claim.
            </p>
          )}
          <p>
            Only enter figures you are authorized to use for the intended
            audience. Export downloads a local Markdown draft; it does not
            publish to LinkedIn or send anything.
          </p>
        </Card>
      )}
    </>
  );
}
