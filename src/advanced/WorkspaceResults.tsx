import { provenance } from "../data/provenance";
import { SlidersHorizontal } from "lucide-react";
import VisualAdditions from "../ui/VisualAdditions";
import { useState } from "react";
import {
  Card,
  NumberField,
  TextField,
  Toggle,
  Select,
  Metric,
  Plot,
} from "./Controls";
import { money, pct, multiple } from "../ui/format";
import type { Project, Forecast } from "./types";
import type { MetricKey } from "./toolSchema";
import Verdict, { verdictLines } from "../ui/verdict";
export function Overview({
  p,
  set,
  m,
  onTrace,
}: {
  p: Project;
  set: (p: Project) => void;
  m: Forecast;
  onTrace: (key: MetricKey) => void;
}) {
  const n = (
    key:
      | "price"
      | "closing"
      | "initialCapex"
      | "openingCash"
      | "minimumCash"
      | "asOfEquity"
      | "months"
      | "rentGrowth"
      | "creditLoss"
      | "otherMonthly"
      | "management"
      | "reservesMonthly"
      | "exitCap"
      | "sellingCost",
    label: string,
    percent = false,
  ) => (
    <NumberField
      key={key}
      label={label}
      value={p[key]}
      percent={percent}
      currency={!percent && !["months"].includes(key)}
      onChange={(v) =>
        set({
          ...p,
          [key]: v,
          ...(key === "months"
            ? {
                lender: {
                  ...p.lender,
                  periodStart: Math.max(
                    1,
                    Math.min(p.lender.periodStart, v - 11),
                  ),
                },
              }
            : {}),
        })
      }
    />
  );
  return (
    <>
      {!m.errors.length && (
        <Verdict
          engine="Monthly planner · dated monthly cash flows"
          lines={verdictLines(
            m.rows.slice(0, 12).reduce((s, r) => s + r.debtService, 0) > 0
              ? m.rows.slice(0, 12).reduce((s, r) => s + r.noi, 0) /
                  m.rows.slice(0, 12).reduce((s, r) => s + r.debtService, 0)
              : null,
            m.irr,
            p.discount,
            m.rows.slice(0, 12).reduce((s, r) => s + r.noi, 0) / p.price,
            p.exitCap,
          )}
        />
      )}
      <div className="metrics adv-metrics">
        <Metric
          label="Year 1 NOI"
          value={money(
            m.errors.length
              ? null
              : m.rows.slice(0, 12).reduce((s, r) => s + r.noi, 0),
          )}
          note="Effective income less operating expenses"
        />
        <Metric
          label="Year 1 DSCR"
          value={multiple(
            m.rows.slice(0, 12).reduce((s, r) => s + r.debtService, 0) > 0
              ? m.rows.slice(0, 12).reduce((s, r) => s + r.noi, 0) /
                  m.rows.slice(0, 12).reduce((s, r) => s + r.debtService, 0)
              : null,
          )}
          note="NOI / regular debt service"
        />
        <Metric
          label="Going-in cap rate"
          value={pct(
            !m.errors.length && p.price > 0
              ? m.rows.slice(0, 12).reduce((s, r) => s + r.noi, 0) / p.price
              : null,
          )}
          note="Year 1 NOI / purchase price"
        />
        <Metric
          label="Year 1 cash-on-cash"
          value={pct(
            m.initialEquity > 0
              ? m.rows
                  .slice(0, 12)
                  .reduce(
                    (s, r) => s + r.noi - r.capex - r.reserves - r.debtService,
                    0,
                  ) / m.initialEquity
              : null,
          )}
          note="Operating cash before sale / initial equity"
        />
        <Metric
          label="Initial / as-of equity"
          onInspect={() => onTrace("equity")}
          value={m.errors.length ? "N/A" : money(m.initialEquity)}
        />
        <Metric
          label="Forecast XIRR"
          onInspect={() => onTrace("irr")}
          value={pct(m.irr)}
          note={m.irrReason ?? "Dated owner cash flows"}
        />
        <Metric
          label="NPV"
          onInspect={() => onTrace("npv")}
          value={money(m.npv)}
          note={`At ${pct(p.discount)} required return`}
        />
        <Metric
          label="Additional equity calls"
          onInspect={() => onTrace("funding")}
          value={m.errors.length ? "N/A" : money(m.additionalEquity)}
        />
      </div>
      <details className="adv-details iq-property-settings">
        <summary>
          <SlidersHorizontal size={16} />
          Property details & model settings{" "}
          <span>Review or edit assumptions</span>
        </summary>
        <Card title="Project and cash policy">
          <div className="adv-form">
            <TextField
              label="Project name"
              value={p.name}
              onChange={(v) => set({ ...p, name: v })}
            />
            <TextField
              label="Location"
              value={p.location}
              onChange={(v) => set({ ...p, location: v })}
            />
            <TextField
              label="Forecast start (first of month)"
              value={p.startDate}
              type="date"
              onChange={(v) => set({ ...p, startDate: v })}
            />
            <TextField
              label="Original acquisition date"
              value={p.acquisitionDate}
              type="date"
              onChange={(v) => set({ ...p, acquisitionDate: v })}
            />
            {n("months", "Forecast months (12–120)")}
            {n(
              "price",
              p.strategy.startsWith("development")
                ? "Land / acquisition cost"
                : "Acquisition price",
            )}
            {n("closing", "Closing costs")}
            {n("initialCapex", "Capital funded at time zero")}
            {n("openingCash", "Opening project cash funded in initial equity")}
            {n("minimumCash", "Minimum retained project cash")}
            {p.strategy === "existing" &&
              n("asOfEquity", "As-of owner equity / opportunity cost")}
            {n("rentGrowth", "General annual rent growth", true)}
            {n("creditLoss", "Collection loss on billed rent", true)}
            <NumberField
              label="Economic vacancy"
              value={p.vacancyRate ?? 0}
              percent
              onChange={(v) => set({ ...p, vacancyRate: v })}
            />
            <NumberField
              label="Concessions on potential rent"
              value={p.concessionRate ?? 0}
              percent
              onChange={(v) => set({ ...p, concessionRate: v })}
            />
            <Select
              label="Growth timing"
              value={p.growthTiming ?? "monthly"}
              onChange={(v) =>
                set({ ...p, growthTiming: v as Project["growthTiming"] })
              }
              options={[
                ["annual", "Annual steps (quick-analysis parity)"],
                ["monthly", "Monthly compounding"],
              ]}
            />
            <NumberField
              label="Reserve and CapEx inflation"
              value={p.inflation ?? 0}
              percent
              onChange={(v) => set({ ...p, inflation: v })}
            />
            <NumberField
              label="Annual capital allowance"
              value={p.annualCapex ?? 0}
              onChange={(v) => set({ ...p, annualCapex: v })}
            />
            <NumberField
              label="Other income growth"
              value={p.otherGrowth ?? 0}
              percent
              onChange={(v) => set({ ...p, otherGrowth: v })}
            />
            {n("otherMonthly", "Other monthly income")}
            {n("management", "Management share of effective income", true)}
            {n("reservesMonthly", "Monthly below-NOI reserve funding")}
            {n("exitCap", "Terminal rental cap rate", true)}
            {n("sellingCost", "Disposition transaction costs", true)}
            <Toggle
              label="Reassess property tax at sale"
              value={p.taxReassessment ?? false}
              onChange={(v) => set({ ...p, taxReassessment: v })}
            />
            {p.taxReassessment && (
              <NumberField
                label="Effective tax rate on sale value"
                value={p.reassessmentRate ?? 0.02}
                percent
                onChange={(v) => set({ ...p, reassessmentRate: v })}
              />
            )}
            <Toggle
              label="Distribute cash above minimum monthly"
              value={p.distribute}
              onChange={(v) => set({ ...p, distribute: v })}
            />
            {p.strategy !== "development-sale" && (
              <Toggle
                label="Sell rental property at end of horizon"
                value={p.sellAtEnd}
                onChange={(v) => set({ ...p, sellAtEnd: v })}
              />
            )}
          </div>
          <p>
            Month 0 capital is separate from unit/budget spending. Existing mode
            does not charge the acquisition price again; enter current debt
            balances and as-of equity. Reserve funding is treated as
            spent/unavailable cash, with no automatic reserve release.
          </p>
        </Card>
      </details>
      <div className="adv-two">
        <Card title="Rent transition">
          <Plot
            source={provenance(p)}
            values={m.rows.map((r) => r.rent)}
            labels={m.rows.map((r) => r.date)}
            title="Collected / billed rent before losses and concessions"
          />
        </Card>
        <Card title="Cash and equity funding">
          <Plot
            source={provenance(p)}
            values={m.rows.map((r) => r.cash)}
            second={m.rows.map((r) => r.capitalCall)}
            labels={m.rows.map((r) => r.date)}
            title="Ending cash and owner capital calls"
            seriesLabel="Ending cash"
            secondLabel="Owner capital calls"
            liquidation={p.sellAtEnd}
          />
          <p>
            Lowest cumulative unfunded cash: {money(m.lowestUnfundedCash)}.
            Owner calls are shown separately, rather than assumed debt.
          </p>
        </Card>
      </div>
      <VisualAdditions p={p} f={m} />
      <AnnualSummary m={m} />
    </>
  );
}
function AnnualSummary({ m }: { m: Forecast }) {
  const years = Array.from({ length: Math.ceil(m.rows.length / 12) }, (_, i) =>
    m.rows.slice(i * 12, i * 12 + 12),
  );
  return (
    <Card title="Annual roll-up of monthly forecast">
      <div className="table-scroll" tabIndex={0}>
        <table>
          <thead>
            <tr>
              {[
                "Year",
                "Rent",
                "NOI",
                "Regular debt",
                "NOI DSCR",
                "Lender NCF DSCR",
                "CapEx",
                "Owner calls",
                "Distributions",
                "Ending debt",
              ].map((v) => (
                <th key={v}>{v}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((a, i) => {
              const sum = (k: keyof (typeof a)[number]) =>
                  a.reduce(
                    (s, r) =>
                      s + (typeof r[k] === "number" ? (r[k] as number) : 0),
                    0,
                  ),
                service = sum("debtService");
              return (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{money(sum("rent"))}</td>
                  <td>{money(sum("noi"))}</td>
                  <td>{money(service)}</td>
                  <td>{multiple(service ? sum("noi") / service : null)}</td>
                  <td>
                    {multiple(service ? sum("lenderNcf") / service : null)}
                  </td>
                  <td>{money(sum("capex"))}</td>
                  <td className="negative">{money(sum("capitalCall"))}</td>
                  <td>{money(sum("distribution"))}</td>
                  <td>{money(a.at(-1)?.balance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
export function MonthlyTable({ p, m }: { p: Project; m: Forecast }) {
  const [from, setFrom] = useState(1),
    [to, setTo] = useState(p.months);
  return (
    <Card
      title="Monthly operating cash and funding ledger"
      note="Capital calls restore the minimum cash balance. Ending cash includes disclosed owner funding. Payoffs include maturity and exit obligations; regular service excludes balloons."
    >
      <div className="adv-form">
        <NumberField
          label="First month to display"
          value={from}
          onChange={setFrom}
        />
        <NumberField
          label="Last month to display"
          value={to}
          onChange={setTo}
        />
      </div>
      <div className="table-scroll" tabIndex={0}>
        <table>
          <thead>
            <tr>
              {[
                "Month / date",
                "Occupied",
                "Rent",
                "NOI",
                "CapEx",
                "Reserves",
                "Regular debt",
                "Draws",
                "Refi proceeds",
                "Payoffs",
                "Fees",
                "Disposition receipts",
                "Before funding",
                "Owner call",
                "Distribution",
                "Ending cash",
                "Debt balance",
                "Owner flow",
              ].map((v) => (
                <th key={v}>{v}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.rows
              .filter((r) => r.month >= from && r.month <= to)
              .map((r) => (
                <tr key={r.month}>
                  <td>
                    {r.month} · {r.date}
                    {r.actual ? " · actual" : ""}
                  </td>
                  <td>{r.occupied}</td>
                  {(
                    [
                      "rent",
                      "noi",
                      "capex",
                      "reserves",
                      "debtService",
                      "draws",
                      "refinance",
                      "payoffs",
                      "fees",
                      "netSale",
                      "cashBefore",
                      "capitalCall",
                      "distribution",
                      "cash",
                      "balance",
                      "equityFlow",
                    ] as const
                  ).map((k) => (
                    <td
                      key={k}
                      className={
                        (k === "capitalCall" && r[k] > 0) || r[k] < 0
                          ? "negative"
                          : ""
                      }
                    >
                      {money(r[k])}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
