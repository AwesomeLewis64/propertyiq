import type { Assumptions, Model } from "../finance/types";
import { money, pct, multiple } from "./format";
import { CashTable } from "./Tables";
import { ScenarioComparison, type ScenarioSettings } from "./Sensitivity";
import Methodology from "./Methodology";
export default function Report({
  a,
  m,
  scenarios,
}: {
  a: Assumptions;
  m: Model;
  scenarios: ScenarioSettings;
}) {
  return (
    <div className="report-page">
      <section className="panel prose">
        <span className="eyebrow">PROPERTYIQ · INVESTMENT ANALYSIS REPORT</span>
        <h2>{a.name || "Untitled property"}</h2>
        <p className="report-meta">
          {a.location} · {a.units} residential units · {a.hold}-year hold ·
          Generated{" "}
          {new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })}{" "}
          (Central Time)
        </p>
        <button
          className="button primary no-print"
          onClick={() => window.print()}
        >
          Print / Save as PDF
        </button>
        <p>
          Use your browser's print destination “Save as PDF”. Landscape
          orientation is recommended for the annual tables.
        </p>
        <div className="report-metrics">
          {[
            ["Purchase price", money(a.price)],
            ["Initial equity", money(m.initialEquity)],
            ["Year 1 NOI", money(m.years[0].noi)],
            ["Year 1 DSCR", multiple(m.years[0].dscr)],
            [
              "Year 1 cash-on-cash",
              pct(
                m.years[0].operatingCash === null
                  ? null
                  : m.years[0].operatingCash / m.initialEquity,
              ),
            ],
            ["Levered IRR", pct(m.irr)],
            ["Equity multiple", multiple(m.multiple)],
            ["Net sale proceeds", money(m.netSale)],
            ["Forward NOI", money(m.forwardNOI)],
            ["Gross exit value", m.forwardNOI > 0 ? money(m.grossExit) : "N/A"],
            ["Total contributions", money(m.invested)],
            ["Total distributions", money(m.distributions)],
            ["Average annual cash-on-cash", pct(m.averageCoc)],
            [
              "Appreciation after selling costs",
              m.forwardNOI > 0 ? money(m.gain) : "N/A",
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <h3>Key assumptions</h3>
        <p>
          Income mode:{" "}
          {a.mode === "manual"
            ? "manual stabilized"
            : "current rent-roll performance"}{" "}
          · Monthly residential rent:{" "}
          {money(a.mode === "rentRoll" ? a.occupiedMonthlyRent : a.rent)}{" "}
          {a.mode === "rentRoll"
            ? "(occupied contractual total)"
            : "(per unit)"}{" "}
          · Other monthly income: {money(a.otherIncome)} · Economic vacancy:{" "}
          {pct(a.vacancy)}
          {a.mode === "rentRoll"
            ? " (not deducted in current rent-roll mode)"
            : ""}{" "}
          · Credit loss: {pct(a.creditLoss)} · Concessions: {pct(a.concessions)}
          .
        </p>
        <p>
          Annual growth: rent {pct(a.rentGrowth)}, other income{" "}
          {pct(a.otherGrowth)}, expenses {pct(a.expenseGrowth)}. Reserves:{" "}
          {money(a.reserves)} per unit annually; annual CapEx{" "}
          {money(a.annualCapex)}. Initial CapEx {money(a.initialCapex)}; closing
          costs {money(a.closingCosts)}.
        </p>
        <p>
          Loan {money(m.loan)} ({pct(m.loan / a.price)} LTV); nominal rate{" "}
          {pct(a.rate)}; {a.amortization}-year amortization; {a.maturity}-year
          maturity; {a.interestOnlyMonths} interest-only months; origination fee{" "}
          {pct(a.loanFee)}. Initial monthly payment {money(m.monthlyPayment, 2)}
          . Exit cap rate {pct(m.effectiveExitCap ?? a.exitCap)}; selling costs{" "}
          {pct(a.sellingCosts)}.
        </p>
        {m.warnings.map((w) => (
          <p className="negative" key={w}>
            {w}
          </p>
        ))}
        {m.irrReason && <p>IRR unavailable: {m.irrReason}</p>}
      </section>
      <div className="report-section">
        <CashTable m={m} a={a} />
      </div>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Financing summary</h2>
            <p>
              Yearly totals from the monthly debt schedule. Monthly rows can be
              exported separately.
            </p>
          </div>
        </div>
        <div className="table-scroll" tabIndex={0}>
          <table>
            <thead>
              <tr>
                {[
                  "Year",
                  "Debt service",
                  "Interest",
                  "Principal paid",
                  "Ending balance",
                  "Balloon due",
                  "DSCR",
                ].map((v) => (
                  <th key={v}>{v}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.years.map((y) => (
                <tr key={y.year}>
                  <th>{y.year}</th>
                  <td>{money(y.debt?.service)}</td>
                  <td>{money(y.debt?.interest)}</td>
                  <td>{money(y.debt?.principal)}</td>
                  <td>{money(y.debt?.balance)}</td>
                  <td>{money(y.debt?.balloon)}</td>
                  <td>{multiple(y.dscr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <ScenarioComparison a={a} editable={false} overrides={scenarios} />
      <div className="report-section">
        <Methodology />
      </div>
    </div>
  );
}
