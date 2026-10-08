import type { Assumptions, Model } from "../finance/types";
import { money, pct } from "./format";
export default function OperatingSummary({
  a,
  m,
}: {
  a: Assumptions;
  m: Model;
}) {
  const y = m.years[0];
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>Year 1 operating fundamentals</h2>
          <p>
            Expenses exclude debt service, reserves and capital expenditures.
          </p>
        </div>
      </div>
      <div className="operating-summary">
        {[
          ["NOI margin", y.egi > 0 ? pct(y.noi / y.egi) : "N/A"],
          ["Operating expense ratio", y.egi > 0 ? pct(y.opex / y.egi) : "N/A"],
          ["Revenue per unit", money(y.egi / a.units)],
          ["NOI per unit", money(y.noi / a.units)],
          ["Expenses per unit", money(y.opex / a.units)],
          ["Initial monthly debt payment", money(m.monthlyPayment, 2)],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
