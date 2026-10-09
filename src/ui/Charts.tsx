import type { Model, Assumptions } from "../finance/types";
import FinancialChart from "./FinancialChart";
import VisualAdditions from "./VisualAdditions";
import { money } from "./format";
import CountUp from "./CountUp";
import { provenance } from "../data/provenance";
export default function Charts({ m, a }: { m: Model; a: Assumptions }) {
  const years = m.years.slice(0, a.hold),
    source = provenance(a);
  return (
    <>
      <div className="chart-grid">
        <FinancialChart
          title="Income & operating performance"
          series={["Effective income", "Operating expenses", "NOI"]}
          rows={years.map((y) => ({
            label: `Year ${y.year}`,
            values: [y.egi, y.opex, y.noi],
          }))}
          note={`Through the selected ${a.hold}-year hold.`}
          source={source}
        />
        <FinancialChart
          title="Cash flow to equity"
          series={["Operating cash flow"]}
          rows={years.map((y) => ({
            label: `Year ${y.year}`,
            values: [y.operatingCash],
          }))}
          note="After regular debt service, reserves and capital costs; excludes sale."
          source={source}
        />
        <FinancialChart
          title="Loan balance"
          series={["Year-end loan balance"]}
          rows={years.map((y) => ({
            label: `Year ${y.year}`,
            values: [y.debt?.balance ?? null],
          }))}
          note="Monthly amortization aggregated annually through exit."
          source={source}
        />
        <section className="panel exit-panel">
          <h2>Exit value bridge</h2>
          <p>
            End of Year {a.hold}; valuation uses Year {a.hold + 1} forward NOI
            as a reference beyond exit.
          </p>
          <div className="bridge">
            <div>
              <span>Gross property value</span>
              <strong>
                <CountUp
                  value={m.forwardNOI > 0 ? m.grossExit : null}
                  format={money}
                />
              </strong>
            </div>
            <div>
              <span>Less selling costs</span>
              <strong>
                <CountUp
                  value={
                    m.forwardNOI > 0 ? -m.grossExit * a.sellingCosts : null
                  }
                  format={money}
                />
              </strong>
            </div>
            <div>
              <span>Less loan payoff</span>
              <strong>
                <CountUp
                  value={
                    years.at(-1)?.debt ? -years.at(-1)!.debt!.balance : null
                  }
                  format={money}
                />
              </strong>
            </div>
            <div className="bridge-total">
              <span>Net sale proceeds to equity</span>
              <strong>
                <CountUp value={m.netSale} format={money} />
              </strong>
            </div>
          </div>
        </section>
      </div>
      <VisualAdditions a={a} m={m} />
    </>
  );
}
