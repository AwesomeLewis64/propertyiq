import { useMemo } from "react";
import type { ProjectEditor } from "./UnitEditor";
import { Card, NumberField, TextField, Select, Toggle } from "./Controls";
import { toolsFor, type Deposit } from "./toolSchema";
import { absorptionPlan, depositLedger } from "./decisionAnalytics";
import { forecast } from "./engine";
import { uid } from "./defaults";
import { money } from "../ui/format";
export default function DevelopmentPlanner({ p, set }: ProjectEditor) {
  const t = toolsFor(p),
    a = t.absorption,
    plan = useMemo(() => absorptionPlan(p), [p]),
    ledger = useMemo(() => depositLedger(p), [p]);
  const candidate = useMemo(
    () => ({ ...p, units: plan, sellingCost: a.commission }),
    [p, plan, a.commission],
  );
  const f = useMemo(() => forecast(candidate), [candidate]);
  const patch = (part: Partial<typeof a>) =>
    set({ ...p, tools: { ...t, absorption: { ...a, ...part } } });
  const deposit = (id: string, part: Partial<Deposit>) =>
    patch({
      deposits: a.deposits.map((d) => (d.id === id ? { ...d, ...part } : d)),
    });
  return (
    <>
      <Card
        title="Development absorption planner"
        note="Schedule sales at a maximum units-per-month pace, respecting unit delivery. Price growth starts from entered base prices. Applying a plan uses combined selling costs, including commissions."
      >
        {p.strategy !== "development-sale" ? (
          <p>
            Select Development → unit sales to apply an absorption plan. Rental
            holds use leasing availability and unit events.
          </p>
        ) : (
          <>
            <div className="adv-form">
              <NumberField
                label="First sales forecast month"
                value={a.start}
                onChange={(v) => patch({ start: v })}
              />
              <NumberField
                label="Maximum unit sales per month"
                value={a.pace}
                onChange={(v) => patch({ pace: v })}
              />
              <NumberField
                label="Annual sale price growth from first sale month"
                value={a.priceGrowth}
                percent
                onChange={(v) => patch({ priceGrowth: v })}
              />
              <NumberField
                label="Combined selling costs including commission"
                value={a.commission}
                percent
                onChange={(v) => patch({ commission: v })}
              />
            </div>
            <div className="table-scroll" tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Delivery month</th>
                    <th>Base price</th>
                    <th>Proposed sale month</th>
                    <th>Proposed price</th>
                    <th>Cancel / defer</th>
                  </tr>
                </thead>
                <tbody>
                  {p.units.map((u, i) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.availableMonth}</td>
                      <td>
                        <NumberField
                          label={`Base sale price for unit ${u.id}`}
                          value={a.basePrices[u.id] ?? u.salePrice}
                          onChange={(v) =>
                            patch({
                              basePrices: { ...a.basePrices, [u.id]: v },
                            })
                          }
                        />
                      </td>
                      <td>{plan[i].saleMonth || "Unscheduled"}</td>
                      <td>{money(plan[i].salePrice)}</td>
                      <td>
                        <Toggle
                          label={`Defer sale for unit ${u.id}`}
                          value={a.cancelled.includes(u.id)}
                          onChange={(v) =>
                            patch({
                              cancelled: v
                                ? [...a.cancelled, u.id]
                                : a.cancelled.filter((id) => id !== u.id),
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {f.errors.map((e) => (
              <p className="alert error" key={e}>
                {e}
              </p>
            ))}
            <p>
              {
                plan.filter((u) => u.saleMonth < 1 || u.saleMonth > p.months)
                  .length
              }{" "}
              units remain unscheduled or outside the hold. Their terminal
              returns are unavailable until sale plans are complete.
            </p>
            <details className="adv-details">
              <summary>Proposed sales pace and remaining inventory</summary>
              <div className="table-scroll" tabIndex={0}>
                <table>
                  <thead>
                    <tr>
                      <th>Forecast month</th>
                      <th>Delivered units</th>
                      <th>Closed sales to date</th>
                      <th>Delivered unsold units</th>
                      <th>Sales this month</th>
                      <th>Gross sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(
                      {
                        length:
                          Number.isInteger(p.months) &&
                          p.months >= 12 &&
                          p.months <= 120
                            ? p.months
                            : 0,
                      },
                      (_, i) => i + 1,
                    ).map((m) => {
                      const delivered = plan.filter(
                          (u) => u.availableMonth <= m,
                        ).length,
                        sold = plan.filter(
                          (u) => u.saleMonth > 0 && u.saleMonth <= m,
                        ).length,
                        sales = plan.filter((u) => u.saleMonth === m);
                      return (
                        <tr key={m}>
                          <td>{m}</td>
                          <td>{delivered}</td>
                          <td>{sold}</td>
                          <td>{delivered - sold}</td>
                          <td>{sales.length}</td>
                          <td>
                            {money(sales.reduce((s, u) => s + u.salePrice, 0))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
            <button
              className="button primary"
              disabled={!!f.errors.length}
              onClick={() =>
                set({
                  ...candidate,
                  tools: {
                    ...t,
                    absorption: {
                      ...a,
                      basePrices: Object.fromEntries(
                        p.units.map((u) => [
                          u.id,
                          a.basePrices[u.id] ?? u.salePrice,
                        ]),
                      ),
                    },
                  },
                })
              }
            >
              Apply absorption and selling-cost plan
            </button>
          </>
        )}
      </Card>
      <Card
        title="Buyer deposits and refundable commitments"
        note="Deposits are tracked as restricted buyer funds. They are not available to finance construction and are not counted again as extra sale revenue. The cash model uses the full sale price at closing, including release of a deposit."
      >
        {a.deposits.map((d) => (
          <details className="adv-details" key={d.id}>
            <summary>
              Unit {d.unit} · deposit {money(d.amount)}
            </summary>
            <div className="adv-form">
              <Select
                label="Deposit unit"
                value={d.unit}
                onChange={(v) => deposit(d.id, { unit: v })}
                options={p.units.map((u) => [u.id, u.id])}
              />
              <NumberField
                label="Buyer deposit forecast month"
                value={d.month}
                onChange={(v) => deposit(d.id, { month: v })}
              />
              <NumberField
                label="Restricted buyer deposit amount"
                value={d.amount}
                onChange={(v) => deposit(d.id, { amount: v })}
              />
              <NumberField
                label="Refund month (0 = retained until closing)"
                value={d.refundMonth}
                onChange={(v) => deposit(d.id, { refundMonth: v })}
              />
              <TextField
                label="Deposit agreement and cancellation reference"
                value={d.note}
                onChange={(v) => deposit(d.id, { note: v })}
              />
            </div>
            <button
              className="button small"
              onClick={() =>
                patch({ deposits: a.deposits.filter((x) => x.id !== d.id) })
              }
            >
              Remove buyer deposit
            </button>
          </details>
        ))}
        <button
          className="button"
          onClick={() =>
            patch({
              deposits: [
                ...a.deposits,
                {
                  id: uid(),
                  unit: p.units[0]?.id ?? "",
                  month: 1,
                  amount: 0,
                  refundMonth: 0,
                  note: "",
                },
              ],
            })
          }
        >
          Add buyer deposit
        </button>
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Received into restricted funds</th>
                <th>Refunded</th>
                <th>Released at sale</th>
                <th>Restricted balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger
                .filter((r) => r.received || r.refund || r.released || r.held)
                .map((r) => (
                  <tr key={r.month}>
                    <td>{r.date.slice(0, 7)}</td>
                    <td>{money(r.received)}</td>
                    <td>{money(r.refund)}</td>
                    <td>{money(r.released)}</td>
                    <td>{money(r.held)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p>
          Cancelled sales must be explicitly rescheduled or refunded. Unsold
          deposits remain buyer liabilities. Escrow restrictions, nonrefundable
          earnest money and lender-approved use of deposits require
          agreement-specific modeling.
        </p>
      </Card>
    </>
  );
}
