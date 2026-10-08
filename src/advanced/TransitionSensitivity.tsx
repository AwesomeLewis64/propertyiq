import { useMemo, useState } from "react";
import type { Project } from "./types";
import { forecast } from "./engine";
import { Card, Select } from "./Controls";
import { money, pct } from "../ui/format";
export default function TransitionSensitivity({ p }: { p: Project }) {
  const [kind, setKind] = useState("transition"),
    [metric, setMetric] = useState("npv");
  const grid = useMemo(() => {
    const rows =
        kind === "transition"
          ? [0, 2, 4, 6, 8]
          : [-0.01, -0.005, 0, 0.005, 0.01].map((v) =>
              Math.max(0.001, p.exitCap + v),
            ),
      cols =
        kind === "transition"
          ? [1, 1.1, 1.2, 1.3, 1.4]
          : [0.8, 0.9, 1, 1.1, 1.2];
    return {
      rows,
      cols,
      values: rows.map((row) =>
        cols.map((col) => {
          const s = structuredClone(p);
          s.actuals = [];
          if (kind === "transition") {
            s.units = s.units.map((u) => ({
              ...u,
              renovationMonth: u.renovationMonth ? u.renovationMonth + row : 0,
              targetMonth: u.targetMonth ? u.targetMonth + row : 0,
              availableMonth: u.availableMonth + row,
              saleMonth: u.saleMonth + row,
              renovationCost: u.renovationCost * col,
              events: u.events?.map((e) => ({ ...e, month: e.month + row })),
            }));
            s.budget = s.budget.map((b) => ({
              ...b,
              start: b.start + row,
              amount: b.amount * col,
            }));
          } else {
            s.exitCap = row;
            s.units = s.units.map((u) => ({
              ...u,
              rent: u.rent * col,
              targetRent: u.targetRent * col,
              renovatedRent: u.renovatedRent * col,
              marketRent: u.marketRent * col,
              salePrice: u.salePrice * col,
              events: u.events?.map((e) => ({
                ...e,
                amount:
                  e.kind === "rent" || e.kind === "lease"
                    ? e.amount * col
                    : e.amount,
              })),
            }));
          }
          const m = forecast(s);
          return m.errors.length
            ? null
            : metric === "irr"
              ? m.irr
              : metric === "calls"
                ? m.additionalEquity
                : m.npv;
        }),
      ),
    };
  }, [p, kind, metric]);
  return (
    <Card
      title="Monthly-model sensitivity"
      note="25 complete forecast recalculations. Recorded actuals are excluded so scenarios compare the operating plan. Values are hypothetical; cell colors carry no investment recommendation."
    >
      <div className="adv-form">
        <Select
          label="Monthly sensitivity dimensions"
          value={kind}
          onChange={setKind}
          options={[
            ["transition", "Delay months × capital cost multiplier"],
            [
              "valuation",
              "Rental exit cap × rent / unit sale price multiplier",
            ],
          ]}
        />
        <Select
          label="Monthly sensitivity metric"
          value={metric}
          onChange={setMetric}
          options={[
            ["npv", "Net present value"],
            ["irr", "Dated XIRR"],
            ["calls", "Additional owner funding"],
          ]}
        />
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>
                {kind === "transition"
                  ? "Delay ↓ / cost →"
                  : "Exit cap ↓ / rent →"}
              </th>
              {grid.cols.map((v) => (
                <th key={v}>{v.toFixed(2)}×</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row, i) => (
              <tr key={i}>
                <th>{kind === "transition" ? `${row} months` : pct(row)}</th>
                {grid.values[i].map((v, j) => (
                  <td key={j} className={v !== null && v < 0 ? "negative" : ""}>
                    {metric === "irr" ? pct(v) : money(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Delay shifts renovation starts, availability, rent targets and sales;
        cost multiplies unit renovations and common capital budgets. In
        unit-sale developments, rental exit cap does not drive unit sales
        prices.
      </p>
    </Card>
  );
}
