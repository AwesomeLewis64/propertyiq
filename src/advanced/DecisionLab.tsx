import { provenance } from "../data/provenance";
import { useMemo, useState } from "react";
import { Card, NumberField, TextField, Toggle, Metric, Plot } from "./Controls";
import type { ProjectEditor } from "./UnitEditor";
import type { Project } from "./types";
import { forecast } from "./engine";
import { dateAt } from "./returns";
import {
  toolsFor,
  baseScenario,
  type Scenario,
  type Offer,
} from "./toolSchema";
import {
  scenarioProject,
  stabilizationMonth,
  renovationPlan,
  applyRenovationPlan,
  offerProject,
  breakEven,
} from "./decisionAnalytics";
import { money, pct, multiple } from "../ui/format";
import { uid } from "./defaults";
type Props = ProjectEditor & {
  create: (p: Project) => void;
  initialSection?: string;
};
export default function DecisionLab(props: Props) {
  const [section, setSection] = useState(props.initialSection ?? "comparison");
  return (
    <>
      <Card
        title="Decision Lab"
        note="Saved assumptions, transparent comparisons, and practical funding questions. Calculations use the operating plan with actual overrides removed."
      >
        <div
          className="decision-tabs"
          role="tablist"
          aria-label="Decision tools"
        >
          {[
            ["comparison", "Base / downside / upside"],
            ["renovations", "Renovation prioritization"],
            ["lenders", "Lender quote comparison"],
            ["breakeven", "Break-even dashboard"],
          ].map(([id, label]) => (
            <button
              type="button"
              role="tab"
              aria-selected={section === id}
              key={id}
              onClick={() => setSection(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>
      {section === "comparison" ? (
        <Comparison {...props} />
      ) : section === "renovations" ? (
        <Renovations {...props} />
      ) : section === "lenders" ? (
        <Lenders {...props} />
      ) : (
        <BreakEven {...props} />
      )}
    </>
  );
}
function Comparison({ p, set, create }: Props) {
  const t = toolsFor(p);
  const cases = useMemo(
    () =>
      [
        ["Base", baseScenario()],
        ["Downside", t.scenarios.downside],
        ["Upside", t.scenarios.upside],
      ].map(([name, s]) => {
        const q = scenarioProject(p, s as Scenario);
        return { name: name as string, p: q, m: forecast(q) };
      }),
    [p, t.scenarios],
  );
  const patch = (
    name: "downside" | "upside",
    key: keyof Scenario,
    value: number,
  ) =>
    set({
      ...p,
      tools: {
        ...t,
        scenarios: {
          ...t.scenarios,
          [name]: { ...t.scenarios[name], [key]: value },
        },
      },
    });
  return (
    <>
      <Card
        title="Three operating and financing scenarios"
        note="Base uses the current operating plan. Scenario rates are hypothetical new fixed-rate quotes or floating reset shocks. A refinance delayed beyond contractual maturity is invalid; maturity is never silently extended."
      >
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                {["Measure", ...cases.map((c) => c.name)].map((v) => (
                  <th key={v}>{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  [
                    "Initial / as-of equity",
                    (c: (typeof cases)[number]) =>
                      money(c.m.errors.length ? null : c.m.initialEquity),
                  ],
                  [
                    "Total additional owner cash",
                    (c: (typeof cases)[number]) =>
                      money(c.m.errors.length ? null : c.m.additionalEquity),
                  ],
                  [
                    "Peak single-month capital call",
                    (c: (typeof cases)[number]) =>
                      money(
                        c.m.rows.length
                          ? Math.max(...c.m.rows.map((r) => r.capitalCall))
                          : null,
                      ),
                  ],
                  [
                    "Stabilization: first 3-month run",
                    (c: (typeof cases)[number]) => {
                      const m = stabilizationMonth(c.p, c.m);
                      return m ? dateAt(c.p.startDate, m - 1) : "Not reached";
                    },
                  ],
                  [
                    "Lender sizing-period coverage",
                    (c: (typeof cases)[number]) =>
                      multiple(c.m.sizing.coverage),
                  ],
                  [
                    "Forecast XIRR",
                    (c: (typeof cases)[number]) => pct(c.m.irr),
                  ],
                  ["NPV", (c: (typeof cases)[number]) => money(c.m.npv)],
                  [
                    "Equity multiple",
                    (c: (typeof cases)[number]) => multiple(c.m.multiple),
                  ],
                ] as const
              ).map(([label, fn]) => (
                <tr key={label}>
                  <th>{label}</th>
                  {cases.map((c) => (
                    <td key={c.name}>{fn(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Stabilization requires three consecutive months meeting the occupancy
          and lender-NCF coverage thresholds in Assumptions & sources. It is a
          planning definition, not an appraisal. Returns can be unavailable even
          when operating figures are shown.
        </p>
        {cases.map((c) => (
          <details className="adv-details" key={c.name}>
            <summary>{c.name} · assumptions and partner returns</summary>
            {c.m.errors.map((e) => (
              <p className="alert error" key={e}>
                {e}
              </p>
            ))}
            {c.m.irrReason && <p>{c.m.irrReason}</p>}
            <div className="table-scroll" tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th>Partner</th>
                    <th>Contribution</th>
                    <th>Distribution</th>
                    <th>XIRR</th>
                  </tr>
                </thead>
                <tbody>
                  {c.m.partners.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{money(r.contributed)}</td>
                      <td>{money(r.distributed)}</td>
                      <td>{pct(c.m.npv === null ? null : r.irr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="button small"
              disabled={!!c.m.errors.length}
              onClick={() => create({ ...c.p, name: `${p.name} — ${c.name}` })}
            >
              Create {c.name.toLowerCase()} project copy
            </button>
          </details>
        ))}
        <Plot
          source={provenance(p)}
          title="Base and downside owner capital calls"
          seriesLabel="Base owner calls"
          secondLabel="Downside owner calls"
          values={cases[0].m.rows.map((r) => r.capitalCall)}
          second={cases[1].m.rows.map((r) => r.capitalCall)}
          labels={cases[0].m.rows.map((r) => r.date)}
        />
      </Card>
      {(["downside", "upside"] as const).map((name) => (
        <Card key={name} title={`Edit ${name} assumptions`}>
          <div className="adv-form">
            {(
              [
                ["rent", "Rent / unit sale price multiplier", false],
                ["cost", "Capital cost multiplier", false],
                ["delay", "Operating schedule delay months", false],
                ["cap", "Rental exit cap (0 = current)", true],
                ["rateShock", "Annual interest rate shock", true],
                ["refiDelay", "Refinance delay months", false],
                ["refiProceeds", "Refinance proceeds multiplier", false],
                ["capExpiry", "First uncapped month (0 = current)", false],
              ] as const
            ).map(([key, label, percent]) => (
              <NumberField
                key={key}
                label={label}
                value={t.scenarios[name][key]}
                percent={percent}
                onChange={(v) => patch(name, key, v)}
              />
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}
function Renovations({ p, set }: Props) {
  const t = toolsFor(p);
  const rank = useMemo(() => renovationPlan(p), [p]);
  const valid = forecast(p).errors.length === 0;
  const selected = rank.filter((r) => r.selected);
  return (
    <Card
      title="Renovation priorities and spending plan"
      note="Ranks first-year incremental operating cash / contingency-adjusted cost and selects only plans with positive incremental net cash within your hold. Estimates exclude debt, taxes, common budgets and terminal value. This is a greedy recommendation, not a globally optimal portfolio solution."
    >
      <div className="adv-form">
        {(
          [
            ["budget", "Total unit renovation spending limit"],
            ["monthly", "Monthly unit renovation spending limit"],
            ["first", "Earliest start month"],
            ["simultaneous", "Maximum units offline at once"],
          ] as const
        ).map(([key, label]) => (
          <NumberField
            key={key}
            label={label}
            value={t.renovation[key]}
            onChange={(v) =>
              set({
                ...p,
                tools: { ...t, renovation: { ...t.renovation, [key]: v } },
              })
            }
          />
        ))}
      </div>
      <div className="metrics adv-metrics">
        <Metric label="Recommended units" value={String(selected.length)} />
        <Metric
          label="Selected spending"
          value={money(selected.reduce((s, r) => s + r.cost, 0))}
        />
      </div>
      <div className="table-scroll" tabIndex={0}>
        <table>
          <thead>
            <tr>
              {[
                "Unit",
                "Cost incl. contingency",
                "Monthly operating uplift",
                "Annual cash yield",
                "Payback within hold",
                "Net operating gain less cost",
                "Duration",
                "Recommended start",
              ].map((v) => (
                <th key={v}>{v}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rank.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{money(r.cost)}</td>
                <td>{money(r.uplift)}</td>
                <td>{pct(r.annualYield)}</td>
                <td>
                  {r.payback === null ? "Not reached" : `${r.payback} months`}
                </td>
                <td>{money(r.horizonNet)}</td>
                <td>{r.duration} months</td>
                <td>{r.start ?? "Not selected"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rank.length && (
        <p>
          Enter unit renovation costs, durations and resulting rents under Units
          & leasing to generate priorities.
        </p>
      )}
      <p>
        Payback includes downtime and spending from the planning start. Existing
        target rents and explicit lease events remain in both comparison paths;
        improvements already achievable without renovation are not credited to
        renovation. Applying the plan enables selected renovations and disables
        unselected renovation candidates while retaining their entered costs.
        Common capital spending remains separate.
      </p>
      <button
        className="button primary"
        disabled={!valid || !selected.length}
        onClick={() => set(applyRenovationPlan(p, rank))}
      >
        Apply recommended unit renovation schedule
      </button>
    </Card>
  );
}
function Lenders({ p, set, create }: Props) {
  const t = toolsFor(p),
    opening = p.loans.find((l) => l.kind === "term" && l.fundingMonth === 0);
  const results = useMemo(
    () =>
      t.offers.map((o) => {
        try {
          const q = offerProject(p, o);
          return { o, q, m: forecast(q), error: "" };
        } catch (e) {
          return {
            o,
            q: p,
            m: forecast({ ...p, actuals: [] }),
            error: e instanceof Error ? e.message : "Invalid quote",
          };
        }
      }),
    [p, t.offers],
  );
  const patch = (id: string, part: Partial<Offer>) =>
    set({
      ...p,
      tools: {
        ...t,
        offers: t.offers.map((o) => (o.id === id ? { ...o, ...part } : o)),
      },
    });
  return (
    <Card
      title="Compare lender quotes"
      note="Each offer replaces the first opening term loan; other debt remains. Entered cash reserves increase opening cash and the retained-cash floor. Rate quotes and fees are assumptions until supported by lender documents."
    >
      <button
        className="button"
        disabled={!opening || t.offers.length >= 10}
        onClick={() =>
          opening &&
          set({
            ...p,
            tools: {
              ...t,
              offers: [
                ...t.offers,
                {
                  id: uid(),
                  name: `Quote ${t.offers.length + 1}`,
                  amount: opening.amount,
                  rate: opening.rate,
                  amort: opening.amortMonths,
                  io: opening.ioMonths,
                  maturity: opening.maturityMonth,
                  fee: opening.fee,
                  penalty: opening.penalty,
                  reserve: 0,
                  source: "",
                },
              ],
            },
          })
        }
      >
        Add quote from current loan
      </button>
      {!opening && (
        <p>
          An opening term loan is required for this comparison. Construction
          financing remains in the debt editor.
        </p>
      )}
      <div className="table-scroll" tabIndex={0}>
        <table>
          <thead>
            <tr>
              {[
                "Offer",
                "Proceeds",
                "Initial equity",
                "Monthly payment 1",
                "Annual debt year 1",
                "Origination fee",
                "Extra reserve",
                "Owner calls",
                "XIRR",
                "NPV",
              ].map((v) => (
                <th key={v}>{v}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map(({ o, m, error }) => (
              <tr key={o.id}>
                <td>{o.name}</td>
                <td>{money(o.amount)}</td>
                <td>
                  {money(error || m.errors.length ? null : m.initialEquity)}
                </td>
                <td>{money(m.rows[0]?.debtService)}</td>
                <td>
                  {money(
                    m.rows.length
                      ? m.rows
                          .slice(0, 12)
                          .reduce((s, r) => s + r.debtService, 0)
                      : null,
                  )}
                </td>
                <td>{money(o.amount * o.fee)}</td>
                <td>{money(o.reserve)}</td>
                <td>{money(m.errors.length ? null : m.additionalEquity)}</td>
                <td>{pct(error ? null : m.irr)}</td>
                <td>{money(error ? null : m.npv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {results.map(({ o, q, m, error }) => (
        <details className="adv-details" key={o.id}>
          <summary>{o.name} · edit and compare terms</summary>
          <div className="adv-form">
            <TextField
              label="Quote name"
              value={o.name}
              onChange={(v) => patch(o.id, { name: v })}
            />
            <TextField
              label="Lender document / source"
              value={o.source}
              onChange={(v) => patch(o.id, { source: v })}
            />
            {(
              [
                ["amount", "Loan proceeds", false],
                ["rate", "Annual rate", true],
                ["amort", "Amortization months", false],
                ["io", "Interest-only months", false],
                ["maturity", "Maturity month", false],
                ["fee", "Origination fee", true],
                ["penalty", "Payoff penalty", true],
                ["reserve", "Additional cash reserve", false],
              ] as const
            ).map(([key, label, percent]) => (
              <NumberField
                key={key}
                label={label}
                value={o[key]}
                percent={percent}
                onChange={(v) => patch(o.id, { [key]: v })}
              />
            ))}
          </div>
          {error && <p className="alert error">{error}</p>}
          {m.errors.map((e) => (
            <p className="alert error" key={e}>
              {e}
            </p>
          ))}
          <div className="adv-actions">
            <button
              className="button"
              disabled={!!error || !!m.errors.length}
              onClick={() => create({ ...q, name: `${p.name} — ${o.name}` })}
            >
              Create project with this offer
            </button>
            <button
              className="button small"
              onClick={() =>
                set({
                  ...p,
                  tools: {
                    ...t,
                    offers: t.offers.filter((x) => x.id !== o.id),
                  },
                })
              }
            >
              Remove quote
            </button>
          </div>
        </details>
      ))}
    </Card>
  );
}
function BreakEven({ p }: Props) {
  const [month, setMonth] = useState(1),
    [capex, setCapex] = useState(false);
  const q = useMemo(() => ({ ...p, actuals: [] }), [p]),
    f = useMemo(() => forecast(q), [q]);
  const b = breakEven(q, f, month, capex);
  return (
    <Card
      title="Break-even dashboard"
      note="Recurring monthly cash coverage under entered expenses and financing. Balloons, refinance fees, tax and construction debt draws are excluded from the monthly coverage equation."
    >
      <div className="adv-form">
        <NumberField
          label="Break-even forecast month"
          value={month}
          min={1}
          max={p.months}
          onChange={setMonth}
        />
        <Toggle
          label="Include this month's planned capital spending"
          value={capex}
          onChange={setCapex}
        />
      </div>
      {p.strategy === "development-sale" ? (
        <p>
          Occupancy and rent break-even apply to rental strategies. Use
          development sales scenarios to assess unit-sale economics.
        </p>
      ) : b ? (
        <>
          <div className="metrics adv-metrics">
            <Metric
              label="Required economic occupancy"
              value={pct(b.occupancy)}
              note="Uniform collected share of this month's potential rent"
            />
            <Metric
              label="Minimum billed monthly rent"
              value={money(b.billedNeeded)}
            />
            <Metric
              label="Rent factor versus current plan"
              value={pct(b.rentFactor)}
            />
            <Metric
              label="Gross exit price returning nominal capital"
              value={money(b.nominalSale)}
              note="All owner contributions recovered; pre-tax, no required return"
            />
          </div>
          {b.occupancy !== null && b.occupancy > 1 && (
            <p className="alert error">
              More than 100% economic occupancy would be required. These entered
              rents cannot cover the selected obligations.
            </p>
          )}
          <p>
            Required billed rent = ((fixed operating costs + scheduled debt +
            reserves + optional CapEx) / (1 − management share) − other income)
            / (1 − collection loss) + planned concessions. Economic occupancy
            divides that amount by full potential rent; it is not an integer
            count of leased units. The rent factor holds the occupied mix and
            concessions fixed.
          </p>
          <p>
            Nominal exit break-even includes capital calls, retained cash, debt
            payoff and transaction costs under the complete rental-exit model.
            It does not mean the investment meets your NPV hurdle. Review
            monthly cash needs separately.
          </p>
        </>
      ) : (
        <p>Choose a valid whole month and correct the project inputs first.</p>
      )}
    </Card>
  );
}
