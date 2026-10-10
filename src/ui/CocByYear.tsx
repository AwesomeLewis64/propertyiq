import type { Assumptions, Model } from "../finance/types";
import { yearlyCoc } from "../finance/criteria";
import { provenance } from "../data/provenance";
import FinancialChart from "./FinancialChart";
import { money, pct } from "./format";

export default function CocByYear({ m, a }: { m: Model; a: Assumptions }) {
  const rows = yearlyCoc(m, a.hold);
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>Cash-on-cash by year</h2>
          <p>
            Annual operating cash flow ÷ initial equity of{" "}
            {money(m.initialEquity)}. Sale proceeds are listed separately and
            are not part of the ratio. No refinancing is assumed.
          </p>
        </div>
      </div>
      <div className="table-scroll" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Operating cash flow (annual)</th>
              <th>Cash-on-cash (annual)</th>
              <th>Net sale proceeds</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year}>
                <th>
                  Year {r.year}
                  {r.year === a.hold ? " · Exit" : ""}
                </th>
                <td className={(r.operatingCash ?? 0) < 0 ? "negative" : ""}>
                  {money(r.operatingCash)}
                </td>
                <td className={(r.coc ?? 0) < 0 ? "negative" : ""}>
                  {pct(r.coc)}
                </td>
                <td>{r.year === a.hold ? money(r.sale) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FinancialChart
        title="Cash-on-cash trend"
        unit="percent"
        series={["Cash-on-cash (annual)"]}
        rows={rows.map((r) => ({ label: `Year ${r.year}`, values: [r.coc] }))}
        note="Annual operating cash flow ÷ initial equity; excludes sale proceeds."
        source={provenance(a)}
      />
    </section>
  );
}
