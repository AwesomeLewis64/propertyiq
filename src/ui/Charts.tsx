import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import type { Model, Assumptions } from "../finance/types";
import { money, compact } from "./format";
export default function Charts({ m, a }: { m: Model; a: Assumptions }) {
  const rows = m.years.map((y) => ({
    name: `Year ${y.year}`,
    NOI: y.noi,
    "Effective income": y.egi,
    "Operating expenses": y.opex,
    "Operating cash flow": y.year <= a.hold ? y.operatingCash : null,
    "Loan balance": y.debt?.balance ?? null,
  }));
  const tip = (
    <Tooltip
      formatter={(v) => money(Number(v))}
      contentStyle={{
        borderRadius: 6,
        border: "1px solid #dbe4e8",
        fontSize: 12,
      }}
    />
  );
  return (
    <div className="chart-grid">
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Income & operating performance</h2>
            <p>Effective income, expenses and net operating income</p>
          </div>
          <span className="badge">{a.hold}-year outlook</span>
        </div>
        <div
          className="chart"
          role="img"
          aria-label="Income, expenses and NOI by year; exact figures are in Cash flows."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ left: 0, right: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e9eef1"
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                tickFormatter={compact}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={58}
              />
              {tip}
              <Legend
                iconType="square"
                wrapperStyle={{ fontSize: 13, color: "#263d58" }}
              />
              <Bar
                dataKey="Effective income"
                fill="#345e95"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="Operating expenses"
                fill="#75613c"
                radius={[3, 3, 0, 0]}
              />
              <Bar dataKey="NOI" fill="#183b6b" radius={[3, 3, 0, 0]}>
                {rows.map((row, i) => (
                  <Cell key={i} fill={row.NOI < 0 ? "#b66c6c" : "#183b6b"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Cash flow to equity</h2>
            <p>After debt, reserves and CapEx · excludes sale</p>
          </div>
        </div>
        <div
          className="chart"
          role="img"
          aria-label="Operating equity cash flows by year; exact figures are in Cash flows."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e9eef1"
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                tickFormatter={compact}
                axisLine={false}
                tickLine={false}
                fontSize={12}
                width={58}
              />
              {tip}
              <Bar
                dataKey="Operating cash flow"
                fill="#7ca6e8"
                radius={[3, 3, 0, 0]}
              >
                {rows.map((row, i) => (
                  <Cell
                    key={i}
                    fill={
                      (row["Operating cash flow"] ?? 0) < 0
                        ? "#b66c6c"
                        : "#7ca6e8"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Loan balance</h2>
            <p>Monthly amortization aggregated annually</p>
          </div>
        </div>
        <div
          className="chart short"
          role="img"
          aria-label="Year-end loan balances; exact figures are in Debt schedule."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e9eef1"
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                tickFormatter={compact}
                axisLine={false}
                tickLine={false}
                fontSize={12}
                width={58}
                domain={["auto", "auto"]}
              />
              {tip}
              <Line
                dataKey="Loan balance"
                stroke="#7ca6e8"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel exit-panel">
        <div className="panel-title">
          <div>
            <h2>Exit value bridge</h2>
            <p>End of Year {a.hold} · forward NOI valuation</p>
          </div>
        </div>
        <div className="bridge">
          <div>
            <span>Gross property value</span>
            <strong>{m.forwardNOI > 0 ? money(m.grossExit) : "N/A"}</strong>
          </div>
          <div>
            <span>Less selling costs</span>
            <strong>
              {m.forwardNOI > 0 ? money(-m.grossExit * a.sellingCosts) : "N/A"}
            </strong>
          </div>
          <div>
            <span>Less loan payoff</span>
            <strong>
              {money(
                m.years[a.hold - 1].debt
                  ? -m.years[a.hold - 1].debt!.balance
                  : null,
              )}
            </strong>
          </div>
          <div className="bridge-total">
            <span>Net proceeds to equity</span>
            <strong>{money(m.netSale)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
