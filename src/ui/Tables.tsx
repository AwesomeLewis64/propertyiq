import Collapsible from "./Collapsible";
import type { Assumptions, Model } from "../finance/types";
import { money, multiple } from "./format";
export function CashTable({ m, a }: { m: Model; a: Assumptions }) {
  const rows: [string, (y: Model["years"][number]) => number | null][] = [
    ["Scheduled residential rent", (y) => y.grossRent],
    ["Vacancy loss", (y) => -y.vacancyLoss],
    ["Credit loss", (y) => -y.creditLoss],
    ["Concessions", (y) => -y.concessions],
    ["Other income", (y) => y.otherIncome],
    ["Effective gross income", (y) => y.egi],
    ["Property taxes", (y) => -y.expenses.taxes],
    ["Insurance", (y) => -y.expenses.insurance],
    ["Repairs & maintenance", (y) => -y.expenses.repairs],
    ["Utilities", (y) => -y.expenses.utilities],
    ["Payroll", (y) => -y.expenses.payroll],
    ["Administration", (y) => -y.expenses.administration],
    ["Marketing", (y) => -y.expenses.marketing],
    ["Other expenses", (y) => -y.expenses.other],
    ["Management", (y) => -y.management],
    ["Total operating expenses", (y) => -y.opex],
    ["Net operating income", (y) => y.noi],
    ["Debt service", (y) => (y.debt ? -y.debt.service : null)],
    ["Replacement reserves", (y) => -y.reserves],
    ["Capital expenditures", (y) => -y.capex],
    [
      "Operating cash to equity",
      (y) => (y.year <= a.hold ? y.operatingCash : null),
    ],
    ["Net sale proceeds", (y) => (y.year === a.hold ? m.netSale : 0)],
    ["Total equity cash flow", (y) => y.equityCash],
    ["Year-end loan balance", (y) => y.debt?.balance ?? null],
  ];
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>Annual underwriting</h2>
          <p>
            Year 0 equity contribution: {money(-m.initialEquity)} · Years after
            exit show operating reference values only
          </p>
        </div>
      </div>
      <div className="table-scroll" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>Cash flow item</th>
              <th>Year 0</th>
              {m.years.map((y) => (
                <th key={y.year}>
                  Year {y.year}
                  {y.year === a.hold
                    ? " · Exit"
                    : y.year > a.hold
                      ? " · Reference beyond exit"
                      : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr
                key={label}
                className={
                  [
                    "Net operating income",
                    "Effective gross income",
                    "Total equity cash flow",
                    "Operating cash to equity",
                  ].includes(label)
                    ? "total-row"
                    : ""
                }
              >
                <th>{label}</th>
                <td>
                  {label === "Total equity cash flow"
                    ? money(-m.initialEquity)
                    : "—"}
                </td>
                {m.years.map((y) => (
                  <td
                    key={y.year}
                    className={(fn(y) ?? 0) < 0 ? "negative" : ""}
                  >
                    {money(fn(y))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export function DebtTable({ m }: { m: Model }) {
  return (
    <>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Annual debt schedule</h2>
            <p>
              Debt yield uses each year's opening principal. DSCR uses NOI
              before reserves.
            </p>
          </div>
        </div>
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                {[
                  "Year",
                  "Opening principal",
                  "Debt service",
                  "Interest",
                  "Principal paid",
                  "Ending balance",
                  "Balloon due at maturity",
                  "DSCR",
                  "Debt yield",
                ].map((v) => (
                  <th key={v}>{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.years.map((y) => (
                <tr key={y.year}>
                  <th>{y.year}</th>
                  <td>{money(y.debt?.opening)}</td>
                  <td>{money(y.debt?.service)}</td>
                  <td>{money(y.debt?.interest)}</td>
                  <td>{money(y.debt?.principal)}</td>
                  <td>{money(y.debt?.balance)}</td>
                  <td>{money(y.debt?.balloon)}</td>
                  <td>{multiple(y.dscr)}</td>
                  <td>
                    {y.debtYield == null
                      ? "N/A"
                      : `${(y.debtYield * 100).toFixed(2)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Monthly amortization</h2>
            <p>
              Full precision internally; dollars shown to two decimals. Balloon
              payoff is deducted at sale, not counted in regular debt service.
            </p>
          </div>
        </div>
        <Collapsible title="Monthly debt schedule" count={m.months.length}>
          <div className="table-scroll debt-scroll" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  {[
                    "Month",
                    "Opening balance",
                    "Payment",
                    "Interest",
                    "Principal",
                    "Ending balance",
                  ].map((v) => (
                    <th key={v}>{v}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.months.map((r) => (
                  <tr key={r.month}>
                    <th>{r.month}</th>
                    {[
                      r.opening,
                      r.payment,
                      r.interest,
                      r.principal,
                      r.balance,
                    ].map((v, i) => (
                      <td key={i}>{money(v, 2)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Collapsible>
      </section>
    </>
  );
}
