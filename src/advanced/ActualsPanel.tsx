import { useMemo } from "react";
import { forecast } from "./engine";
import type { ProjectEditor } from "./UnitEditor";
import { Card, NumberField, TextField, Metric } from "./Controls";
import { money } from "../ui/format";
export default function ActualsPanel({ p, set }: ProjectEditor) {
  const budget = useMemo(() => forecast({ ...p, actuals: [] }), [p]);
  const trailing = [...p.actuals]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);
  const actualNoi = trailing.reduce(
      (s, r) => s + r.rent + r.otherIncome - r.opex,
      0,
    ),
    actualCash = trailing.reduce(
      (s, r) => s + r.rent + r.otherIncome - r.opex - r.capex - r.debtService,
      0,
    );
  return (
    <>
      <Card
        title="Actual performance and variance"
        note="Actuals override complete monthly income, expense, CapEx and debt-service values in matched forecast periods. Forecast-only budget remains available below. Imported historical periods can be inspected even outside the forecast."
      >
        {!p.actuals.length && (
          <p>
            No actual periods recorded. Add a complete statement or import
            actuals to compare performance.
          </p>
        )}
        <div className="metrics adv-metrics">
          <Metric
            label="Recorded monthly periods"
            value={String(p.actuals.length)}
          />
          <Metric
            label="Latest up-to-12-period NOI"
            value={money(trailing.length ? actualNoi : null)}
            note={`${trailing.length} recorded periods; gaps are not filled`}
          />
          <Metric
            label="Recorded cash before reserves"
            value={money(trailing.length ? actualCash : null)}
          />
        </div>
        <div className="adv-actions">
          <button
            className="button"
            onClick={() => {
              const month = p.startDate.slice(0, 7);
              if (!p.actuals.some((a) => a.month === month))
                set({
                  ...p,
                  actuals: [
                    ...p.actuals,
                    {
                      month,
                      rent: NaN,
                      otherIncome: NaN,
                      opex: NaN,
                      capex: NaN,
                      debtService: NaN,
                    },
                  ],
                });
            }}
          >
            Add first forecast month actuals
          </button>
          <button
            className="button"
            onClick={() => {
              const dates = [...p.actuals.map((a) => a.month)].sort(),
                last = dates.at(-1) ?? p.startDate.slice(0, 7);
              const d = new Date(`${last}-01T00:00:00Z`);
              d.setUTCMonth(d.getUTCMonth() + 1);
              set({
                ...p,
                actuals: [
                  ...p.actuals,
                  {
                    month: d.toISOString().slice(0, 7),
                    rent: NaN,
                    otherIncome: NaN,
                    opex: NaN,
                    capex: NaN,
                    debtService: NaN,
                  },
                ],
              });
            }}
          >
            Add next actual month
          </button>
        </div>
        {p.actuals.map((a, i) => (
          <details className="adv-details" key={i}>
            <summary>
              {a.month} · NOI {money(a.rent + a.otherIncome - a.opex)}
            </summary>
            <div className="adv-form">
              <TextField
                label="Actual period YYYY-MM"
                value={a.month}
                type="month"
                onChange={(v) =>
                  set({
                    ...p,
                    actuals: p.actuals.map((x, j) =>
                      j === i ? { ...x, month: v } : x,
                    ),
                  })
                }
              />
              {(
                [
                  ["rent", "Collected rent"],
                  ["otherIncome", "Other income"],
                  ["opex", "Operating expenses"],
                  ["capex", "Capital spending"],
                  ["debtService", "Paid regular debt service"],
                ] as const
              ).map(([k, label]) => (
                <NumberField
                  key={k}
                  label={label}
                  currency
                  value={a[k]}
                  onChange={(v) =>
                    set({
                      ...p,
                      actuals: p.actuals.map((x, j) =>
                        j === i ? { ...x, [k]: v } : x,
                      ),
                    })
                  }
                />
              ))}
            </div>
            <button
              className="button small"
              onClick={() =>
                set({ ...p, actuals: p.actuals.filter((_, j) => j !== i) })
              }
            >
              Remove actual period
            </button>
          </details>
        ))}
      </Card>
      <Card title="Monthly NOI budget versus actual">
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                {[
                  "Period",
                  "Budget NOI",
                  "Actual NOI",
                  "Actual − budget",
                  "Budget CapEx",
                  "Actual CapEx",
                  "Budget regular debt",
                  "Actual regular debt",
                ].map((v) => (
                  <th key={v}>{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.actuals.map((a) => {
                const b = budget.rows.find(
                    (r) => r.date.slice(0, 7) === a.month,
                  ),
                  noi = a.rent + a.otherIncome - a.opex;
                return (
                  <tr key={a.month}>
                    <td>{a.month}</td>
                    <td>{money(b?.noi)}</td>
                    <td>{money(noi)}</td>
                    <td>{money(b ? noi - b.noi : null)}</td>
                    <td>{money(b?.capex)}</td>
                    <td>{money(a.capex)}</td>
                    <td>{money(b?.debtService)}</td>
                    <td>{money(a.debtService)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p>
          Actual NOI follows the entered statement classification. Debt
          principal is not an operating expense. Lender NCF adjustments remain
          separate. Actual debt-service amounts do not infer actual principal
          balances.
        </p>
      </Card>
    </>
  );
}
