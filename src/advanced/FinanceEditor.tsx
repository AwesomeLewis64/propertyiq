import { useState } from "react";
import {
  Card,
  NumberField,
  TextField,
  Toggle,
  Select,
  Metric,
} from "./Controls";
import { newLoan } from "./defaults";
import type { Loan, Forecast } from "./types";
import type { ProjectEditor } from "./UnitEditor";
import { money, multiple, pct } from "../ui/format";
export default function FinanceEditor({
  p,
  set,
  m,
}: { m: Forecast } & ProjectEditor) {
  const [selected, setSelected] = useState(0);
  const loan = p.loans[selected];
  const patch = (key: keyof Loan, value: Loan[keyof Loan]) =>
    set({
      ...p,
      loans: p.loans.map((l, i) =>
        i === selected ? { ...l, [key]: value } : l,
      ),
    });
  const n = (key: keyof Loan, label: string, percent = false) =>
    loan && (
      <NumberField
        key={key}
        label={label}
        value={loan[key] as number}
        percent={percent}
        onChange={(v) => patch(key, v)}
      />
    );
  const s = m.sizing;
  return (
    <>
      <Card
        title="Automatic borrowing capacity"
        note="Based on your selected forecast year, entered lender adjustments and stress payment convention. These are configurable calculations, not lender approval."
      >
        <div className="adv-form">
          {(
            [
              ["minDscr", "Minimum DSCR", false],
              ["maxLtv", "Maximum LTV", true],
              ["minYield", "Minimum debt yield", true],
              ["value", "Underwritten property value", false],
              ["periodStart", "Start month of 12-month sizing period", false],
              ["reserveAnnual", "Annual reserve deduction from NOI", false],
              ["adjustmentAnnual", "Annual signed lender adjustment", false],
              ["stressRate", "Underwritten annual rate", true],
              ["amortMonths", "Underwritten amortization months", false],
            ] as const
          ).map(([key, label, percent]) => (
            <NumberField
              key={key}
              label={label}
              value={p.lender[key]}
              percent={percent}
              onChange={(v) => set({ ...p, lender: { ...p.lender, [key]: v } })}
            />
          ))}
          <Toggle
            label="Size using interest-only debt service"
            value={p.lender.useIO}
            onChange={(v) => set({ ...p, lender: { ...p.lender, useIO: v } })}
          />
        </div>
        <div className="metrics adv-metrics">
          <Metric label="Underwritten NCF" value={money(s.ncf)} />
          <Metric
            label="Maximum debt"
            value={m.errors.length ? "N/A" : money(s.maximum)}
            note={`${s.binding} is binding`}
          />
          <Metric label="Borrowing reduction" value={money(s.reduction)} />
          <Metric
            label="Additional closing equity"
            value={money(s.extraEquity)}
            note="Accounts for reduced origination fees"
          />
        </div>
        <p>
          DSCR limit {money(s.dscrLoan)} · LTV limit {money(s.ltvLoan)} ·
          Debt-yield limit {money(s.yieldLoan)} · Current debt stressed coverage{" "}
          {multiple(s.coverage)}.
        </p>
        <button
          className="button"
          disabled={
            m.errors.length > 0 ||
            p.loans.filter((l) => l.kind === "term" && l.fundingMonth === 0)
              .length !== 1
          }
          onClick={() =>
            set({
              ...p,
              loans: p.loans.map((l) =>
                l.kind === "term" && l.fundingMonth === 0
                  ? { ...l, amount: s.maximum }
                  : l,
              ),
            })
          }
        >
          Apply maximum to sole opening term loan
        </button>
        <p className="adv-muted">
          Choose amortizing underwriting when your lender tests coverage on
          amortizing payments even during IO. Multiple opening loans require
          manual allocation of the total capacity.
        </p>
      </Card>
      <Card
        title="Loans and refinancing"
        note="Separate loans can represent senior, supplemental or other amortizing/IO debt. Existing-property balances should be entered with remaining amortization and remaining maturity. Month-end refinance follows that month's regular payment."
      >
        <div className="adv-actions">
          <button
            className="button"
            onClick={() => {
              set({
                ...p,
                loans: [
                  ...p.loans,
                  { ...newLoan(), name: `Loan ${p.loans.length + 1}` },
                ],
              });
              setSelected(p.loans.length);
            }}
          >
            Add loan
          </button>
          <Select
            label="Edit loan"
            value={String(selected)}
            onChange={(v) => setSelected(Number(v))}
            options={p.loans.map((l, i) => [String(i), l.name])}
          />
        </div>
        {loan ? (
          <>
            <div className="adv-form">
              <TextField
                label="Loan name (unique)"
                value={loan.name}
                onChange={(v) => patch("name", v)}
              />
              <Select
                label="Loan structure"
                value={loan.kind}
                onChange={(v) => patch("kind", v as Loan["kind"])}
                options={[
                  ["term", "Funded term loan"],
                  ["construction", "Construction commitment / cost draws"],
                ]}
              />
              {n(
                "amount",
                loan.kind === "construction"
                  ? "Total commitment including capitalized interest"
                  : "Opening / funding principal",
              )}
              {n("fundingMonth", "Funding month (0 = at start)")}
              {n("rate", "Annual interest rate", true)}
              {n("amortMonths", "Original / remaining amortization months")}
              {n("ioMonths", "Interest-only months")}
              <Select
                label="Interest-only amortization"
                value={loan.ioConvention ?? "after-io"}
                onChange={(v) =>
                  patch("ioConvention", v as typeof loan.ioConvention)
                }
                options={[
                  ["after-io", "Full amortization after IO"],
                  ["consumes-term", "IO consumes original term"],
                ]}
              />
              <Select
                label="Interest accrual"
                value={loan.accrual ?? "30/360"}
                onChange={(v) => patch("accrual", v as typeof loan.accrual)}
                options={[
                  ["30/360", "30/360"],
                  ["actual/360", "Actual calendar days / 360"],
                ]}
              />
              {n("maturityMonth", "Maturity forecast month")}
              {n("fee", "Origination fee on commitment", true)}
              {n("penalty", "Payoff penalty", true)}
              <Toggle
                label="Floating rate with manual rate path"
                value={loan.floating}
                onChange={(v) => patch("floating", v)}
              />
              {loan.floating && n("rateCap", "Annual rate ceiling", true)}
              {loan.floating && (
                <NumberField
                  label="First uncapped month (0 = no expiry)"
                  value={loan.rateCapExpiry ?? 0}
                  onChange={(v) => patch("rateCapExpiry", v)}
                />
              )}
              {loan.kind === "construction" && (
                <>
                  {n("ltc", "Share of eligible costs funded", true)}
                  <Toggle
                    label="Capitalize interest within remaining commitment"
                    value={loan.capitalizeInterest}
                    onChange={(v) => patch("capitalizeInterest", v)}
                  />
                  {n("releasePercent", "Net unit sales applied to debt", true)}
                </>
              )}
              {n("refiMonth", "Refinance month (0 = none)")}
              {loan.refiMonth > 0 && (
                <>
                  {n(
                    "refiAmount",
                    "Replacement amount (0 = forward value × LTV)",
                  )}
                  {n("refiLtv", "Replacement LTV", true)}
                  {n("refiRate", "Replacement annual rate", true)}
                  {n("refiAmort", "Replacement amortization months")}
                  {n("refiIo", "Replacement IO months")}
                  {n("refiFee", "Replacement origination fee", true)}
                  {n("refiMaturity", "Replacement maturity forecast month")}
                </>
              )}
            </div>
            {loan.floating && (
              <div>
                <h3>Rate resets</h3>
                {loan.ratePoints.map((r, i) => (
                  <div className="adv-inline" key={i}>
                    <NumberField
                      label="Effective forecast month"
                      value={r.month}
                      onChange={(v) =>
                        patch(
                          "ratePoints",
                          loan.ratePoints.map((x, j) =>
                            j === i ? { ...x, month: v } : x,
                          ),
                        )
                      }
                    />
                    <NumberField
                      label="All-in annual rate"
                      value={r.annual}
                      percent
                      onChange={(v) =>
                        patch(
                          "ratePoints",
                          loan.ratePoints.map((x, j) =>
                            j === i ? { ...x, annual: v } : x,
                          ),
                        )
                      }
                    />
                    <button
                      className="button small"
                      onClick={() =>
                        patch(
                          "ratePoints",
                          loan.ratePoints.filter((_, j) => j !== i),
                        )
                      }
                    >
                      Remove reset
                    </button>
                  </div>
                ))}
                <button
                  className="button small"
                  onClick={() =>
                    patch("ratePoints", [
                      ...loan.ratePoints,
                      { month: 13, annual: 0.07 },
                    ])
                  }
                >
                  Add rate reset
                </button>
              </div>
            )}
            <button
              className="button small"
              onClick={() => {
                set({ ...p, loans: p.loans.filter((_, i) => i !== selected) });
                setSelected(0);
              }}
            >
              Remove loan
            </button>
          </>
        ) : (
          <p>No loans: unlevered forecast.</p>
        )}
      </Card>
      <Card title="Debt audit trail">
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                {[
                  "Month",
                  "Loan",
                  "Opening",
                  "Draw",
                  "Rate",
                  "Interest",
                  "Capitalized",
                  "Regular service",
                  "Payoff",
                  "Refi proceeds",
                  "Ending",
                ].map((v) => (
                  <th key={v}>{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.debt.map((r, i) => (
                <tr key={i}>
                  <td>{r.month}</td>
                  <td>{r.loan}</td>
                  <td>{money(r.opening)}</td>
                  <td>{money(r.draw)}</td>
                  <td>{pct(r.rate)}</td>
                  <td>{money(r.interest)}</td>
                  <td>{money(r.capitalized)}</td>
                  <td>{money(r.service)}</td>
                  <td>{money(r.payoff)}</td>
                  <td>{money(r.refinance)}</td>
                  <td>{money(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
