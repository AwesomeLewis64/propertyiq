import type { Project, Forecast, Monthly } from "./types";
import VisualAdditions from "../ui/VisualAdditions";
import { provenance } from "../data/provenance";
import Brand from "../ui/Brand";
import { money, pct, multiple } from "../ui/format";
export default function PropertyReport({ p, m }: { p: Project; m: Forecast }) {
  const first = m.rows.slice(0, 12);
  const sum = (rows: Monthly[], key: keyof Monthly) =>
    rows.reduce(
      (n, r) => n + (typeof r[key] === "number" ? (r[key] as number) : 0),
      0,
    );
  const years = Array.from({ length: Math.ceil(m.rows.length / 12) }, (_, i) =>
    m.rows.slice(i * 12, i * 12 + 12),
  );
  return (
    <article className="iq-report">
      <div className="iq-report-masthead print-only">
        <span className="brand">
          <Brand />
        </span>
        <span>PROPERTY ANALYSIS REPORT</span>
      </div>
      <div className="iq-report-title">
        <span className="iq-eyebrow">THE BIGGER PICTURE</span>
        <h2>{p.name}</h2>
        <p>
          {p.location || "Location not supplied"} · {p.units.length} units ·
          Forecast from {p.startDate}
        </p>
      </div>
      <p className="iq-report-status">
        {provenance(p)} ·{" "}
        {first.some((r) => r.actual)
          ? "Includes posted actual overrides"
          : "Forecast"}{" "}
        · Reconciliation required
      </p>
      {m.errors.length ? (
        <p className="alert error">
          Complete the property assumptions to produce this report.
        </p>
      ) : (
        <>
          <h3>Income at a glance</h3>
          <p className="iq-report-period">
            First {first.length} forecast months · before financing and capital
            spending
          </p>
          <div className="iq-report-metrics">
            {[
              ["Billed rental income", sum(first, "rent")],
              ["Operating expenses", sum(first, "expenses")],
              ["Net operating income", sum(first, "noi")],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{money(value as number)}</strong>
              </div>
            ))}
          </div>
          <p className="iq-report-caption">
            NOI includes other income and deducts concessions, collection losses
            and operating expenses. It excludes debt, reserves and capital
            spending.
          </p>
          <h3>Capital and returns</h3>
          <div className="iq-report-metrics">
            {[
              ["Initial / as-of equity", money(m.initialEquity)],
              ["Additional owner funding", money(m.additionalEquity)],
              ["Forecast dated XIRR", pct(m.irr)],
              ["NPV", money(m.npv)],
              ["Equity multiple", multiple(m.multiple)],
              ["Gross rental exit value", money(m.grossExit)],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <p className="iq-report-caption">
            NPV uses a {pct(p.discount)} required return.{" "}
            {m.irrReason ??
              "Returns follow dated owner cash contributions and distributions."}{" "}
            Development unit sales use their individual sale schedules.
          </p>
          <h3>Through the hold</h3>
          <div className="table-scroll" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  {[
                    "Year",
                    "Rent",
                    "NOI",
                    "Scheduled debt",
                    "Capital spending",
                    "Owner funding",
                    "Distributions",
                  ].map((s) => (
                    <th key={s}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {years.map((rows, i) => (
                  <tr key={i}>
                    <th>{i + 1}</th>
                    {(
                      [
                        "rent",
                        "noi",
                        "debtService",
                        "capex",
                        "capitalCall",
                        "distribution",
                      ] as const
                    ).map((key) => (
                      <td key={key}>{money(sum(rows, key))}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>The assumptions behind it</h3>
          <div className="iq-report-assumptions">
            <p>
              Strategy <strong>{p.strategy}</strong>
            </p>
            <p>
              Purchase / land cost <strong>{money(p.price)}</strong>
            </p>
            <p>
              Rental exit cap <strong>{pct(p.exitCap)}</strong>
            </p>
            <p>
              Selling costs <strong>{pct(p.sellingCost)}</strong>
            </p>
            <p>
              General rent growth <strong>{pct(p.rentGrowth)}</strong>
            </p>
            <p>
              Debt facilities <strong>{p.loans.length}</strong>
            </p>
          </div>
          <p className="iq-report-caption">
            Inspect unit events, expenses and financing in their workspace
            sections. The calendar and source records explain the timing and
            evidence for these assumptions.
          </p>
        </>
      )}
      {!m.errors.length && <VisualAdditions p={p} f={m} />}
      <div className="iq-report-notes">
        <h3>Review before relying on results</h3>
        <p>
          This report does not verify rents, costs, lender terms or market
          value. Reconcile the source workbook and review incomplete funding,
          sales and maturity assumptions.
        </p>
        {m.warnings.map((w) => (
          <p key={w}>{w}</p>
        ))}
      </div>
      <div className="iq-report-bottom">
        PropertyIQ · Calculated locally in your browser
      </div>
    </article>
  );
}
