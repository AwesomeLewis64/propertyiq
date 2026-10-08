import { useMemo, useState } from "react";
import { Card, Select, TextField, NumberField } from "./Controls";
import type { ProjectEditor } from "./UnitEditor";
import { toolsFor, metricLabels, type MetricKey } from "./toolSchema";
import { forecast } from "./engine";
import { qualityFlags, metricValue } from "./decisionAnalytics";
import { money, pct, multiple } from "../ui/format";
const formulas: Record<MetricKey, string> = {
  noi: "Sum of monthly NOI over the selected reconciliation period. NOI = rent − concessions − credit loss + other income − operating expenses. Posted actuals replace these components in matched periods.",
  debt: "Sum of scheduled regular loan payments over the selected period. Maturity balloons, refinancing payoffs and fees are separate cash movements; actual debt-service overrides do not change modeled principal.",
  dscr: "Selected-period NOI / selected-period scheduled regular debt service. Lender NCF coverage differs: reserves and signed lender adjustments affect its numerator.",
  equity:
    "Acquisition: price + closing costs + time-zero CapEx + opening cash + opening financing fees − opening debt. Existing property: user-entered as-of equity.",
  funding:
    "Sum of positive monthly capital calls. Each call restores the cash floor after operations, spending, debt, draws, fees and disposition receipts. This is total additional contributions, not a single-month maximum.",
  irr: "Dated owner contributions/distributions solve Σ cash flow / (1 + rate)^(days since first flow / 365) = 0. Multiple sign changes suppress a unique IRR claim.",
  npv: "Σ dated owner cash flow / (1 + entered discount rate)^(days since first flow / 365). Incomplete terminal dispositions suppress this result.",
  multiple:
    "Total positive owner cash flows / absolute total negative owner cash flows. Loan proceeds are not owner distributions until cash policy permits distribution.",
  exit: "Rental only: sum of next-12-month NOI after the hold / entered exit cap. Selling costs, payoffs and penalties affect net equity proceeds separately.",
};
export default function SourcesPanel({
  p,
  set,
  initialMetric = "noi",
}: ProjectEditor & { initialMetric?: MetricKey }) {
  const [metric, setMetric] = useState<MetricKey>(initialMetric);
  const t = toolsFor(p),
    f = useMemo(() => forecast(p), [p]),
    flags = useMemo(() => qualityFlags(p, f), [p, f]);
  const link = t.sources.find((s) => s.metric === metric) ?? {
    metric,
    evidenceId: "",
    note: "",
    reviewed: "",
  };
  const evidence = p.evidence.find((e) => e.id === link.evidenceId);
  const patch = (part: Partial<typeof link>) =>
    set({
      ...p,
      tools: {
        ...t,
        sources: [
          ...t.sources.filter((s) => s.metric !== metric),
          { ...link, ...part },
        ],
      },
    });
  const value = metricValue(p, f, metric),
    display =
      metric === "irr"
        ? pct(value)
        : metric === "dscr" || metric === "multiple"
          ? multiple(value)
          : money(value);
  return (
    <>
      <Card
        title="Assumption quality checks"
        note="Review flags use your thresholds and supplied evidence. They do not substitute for market research or guarantee reasonable assumptions."
      >
        <div className="adv-form">
          {(
            [
              ["insurancePerUnit", "Minimum annual insurance per unit", false],
              [
                "maxCompPremium",
                "Maximum premium above supplied rent comps",
                true,
              ],
              ["occupancyTarget", "Stabilization occupancy target", true],
              ["minDscr", "Stabilization lender NCF DSCR", false],
            ] as const
          ).map(([key, label, percent]) => (
            <NumberField
              key={key}
              label={label}
              value={t.quality[key]}
              percent={percent}
              onChange={(v) =>
                set({
                  ...p,
                  tools: { ...t, quality: { ...t.quality, [key]: v } },
                })
              }
            />
          ))}
        </div>
        {flags.map((flag) => (
          <div className="adv-details" key={flag.title}>
            <strong>
              {flag.severity === "missing" ? "Missing support" : "Review"}:{" "}
              {flag.title}
            </strong>
            <p>{flag.detail}</p>
          </div>
        ))}
        {!flags.length && (
          <p>
            No rules triggered. This does not mean due diligence is complete.
          </p>
        )}
      </Card>
      <Card
        title="Source-linked calculations"
        note="Select a result to inspect its definition, contributing assumptions and linked evidence. Links and review dates are user-reported."
      >
        <Select
          label="Calculation to trace"
          value={metric}
          onChange={(v) => setMetric(v as MetricKey)}
          options={Object.entries(metricLabels)}
        />
        <h3>
          {metricLabels[metric]}: {display}
        </h3>
        <p>{formulas[metric]}</p>
        <div className="adv-form">
          <Select
            label="Supporting evidence record"
            value={link.evidenceId}
            onChange={(v) => patch({ evidenceId: v })}
            options={[
              ["", "No supporting source selected"],
              ...p.evidence.map(
                (e) => [e.id, `${e.title} · ${e.status}`] as [string, string],
              ),
            ]}
          />
          <TextField
            label="Calculation source review date"
            type="date"
            value={link.reviewed}
            onChange={(v) => patch({ reviewed: v })}
          />
          <TextField
            label="Definition, source ranges and adjustments"
            value={link.note}
            onChange={(v) => patch({ note: v })}
          />
        </div>
        {evidence ? (
          <p>
            Source: {evidence.title} · {evidence.source} ·{" "}
            {evidence.date || "undated"} · {evidence.status}. {evidence.note}
          </p>
        ) : (
          <p className="alert">
            This calculation has no linked supporting source.
          </p>
        )}
        <details className="adv-details">
          <summary>Contributing project assumptions</summary>
          <div className="table-scroll" tabIndex={0}>
            <table>
              <tbody>
                {Object.entries({
                  "Acquisition price": money(p.price),
                  "Closing costs": money(p.closing),
                  "Opening cash": money(p.openingCash),
                  "Minimum cash": money(p.minimumCash),
                  "Credit loss": pct(p.creditLoss),
                  Management: pct(p.management),
                  "Exit cap": pct(p.exitCap),
                  "Required return": pct(p.discount),
                  "Reconciliation period": `Months ${t.reconciliation.start}–${t.reconciliation.start + t.reconciliation.length - 1}`,
                  "Explicit unit events": p.units.reduce(
                    (s, u) => s + (u.events?.length ?? 0),
                    0,
                  ),
                  "Posted actual periods": p.actuals.length,
                }).map(([name, val]) => (
                  <tr key={name}>
                    <th>{name}</th>
                    <td>{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Inspect Units, Expenses, Debt, and Monthly cash for the full input
            and row-level audit trail. Workbook mappings retain their source
            file and cell reference in Reconciliation.
          </p>
        </details>
      </Card>
    </>
  );
}
