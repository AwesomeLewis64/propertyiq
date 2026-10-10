import { useMemo, useState } from "react";
import type { Assumptions, Model } from "../finance/types";
import type { Project, Forecast } from "../advanced/types";
import {
  annualBridge,
  monthlyBridge,
  annualRecovery,
  monthlyRecovery,
  annualTornado,
  monthlyTornado,
  defaultTornado,
  validTornado,
} from "../analytics/visuals";
import FinancialChart from "./FinancialChart";
import { provenance } from "../data/provenance";
type Props =
  | { a: Assumptions; m: Model; p?: never; f?: never }
  | { p: Project; f: Forecast; a?: never; m?: never };
export default function VisualAdditions(props: Props) {
  const [period, setPeriod] = useState(0),
    [settings, setSettings] = useState(defaultTornado);
  const count = props.p
    ? props.f.rows.length
    : Math.min(props.a.hold, props.m.years.length);
  const index = Math.min(period, Math.max(0, count - 1));
  const bridge = useMemo(
    () =>
      count
        ? props.p
          ? monthlyBridge(props.p, props.f.rows[index])
          : annualBridge(props.m.years[index])
        : [],
    [props, count, index],
  );
  const recovery = useMemo(
    () =>
      props.p
        ? monthlyRecovery(props.p, props.f)
        : annualRecovery(props.a, props.m),
    [props],
  );
  const tornado = useMemo(
    () =>
      props.p
        ? monthlyTornado(props.p, settings)
        : annualTornado(props.a, settings),
    [props, settings],
  );
  const source = provenance(props.p ?? props.a);
  const monthly = !!props.p;
  const valid = props.p ? !props.f.errors.length : !props.m.errors.length;
  if (!valid || !count)
    return (
      <p className="alert">
        Complete valid assumptions to view the financial charts.
      </p>
    );
  return (
    <div className="visual-additions">
      <label className="chart-period">
        Bridge period
        <select
          value={index}
          onChange={(e) => setPeriod(Number(e.target.value))}
        >
          {Array.from({ length: count }, (_, i) => (
            <option key={i} value={i}>
              {monthly ? props.f!.rows[i].date : `Year ${i + 1}`}
            </option>
          ))}
        </select>
      </label>
      <FinancialChart
        title="Income-to-cash-flow bridge"
        series={["Cash flow step"]}
        bridge={bridge}
        rows={bridge.map((r) => ({ label: r.label, values: [r.value] }))}
        source={source}
        note={`${monthly ? props.f!.rows[index].date : `Year ${index + 1}`} · NOI excludes financing and capital. Debt service already includes scheduled principal. Excludes sale, financing receipts, balloons and distributions.`}
      />
      <FinancialChart
        title="Capital recovery timeline"
        series={[
          "Contributed / as-of equity",
          monthly
            ? "Cumulative operating distributions (allocated)"
            : "Cumulative operating distributions",
          "Net sale proceeds",
          ...(monthly ? ["Total owner distributions"] : []),
        ]}
        rows={recovery.map((r) => ({
          label: r.label,
          values: [
            r.contributions,
            monthly ? (r.operatingDistributions ?? null) : r.distributions,
            r.sale,
            ...(monthly ? [r.distributions] : []),
          ],
        }))}
        source={source}
        note={`${monthly ? "Operating distributions attribute retained operating surplus first, after operating deficits; this is a source-allocation convention, not segregated cash accounting. Total owner distributions can also include initial cash, financing and sales. Net sale receipts after sale-related debt payoff and fees are a reference; never add them to total distributions. Existing-property opening equity is an opportunity-cost value." : "Includes additional contributions from negative operating cash flow. Net sale proceeds are separate from operating distributions, after selling costs and loan payoff."} Nominal recovery does not account for the time value of money.`}
      />
      <section className="panel tornado-settings no-print">
        <h2>Sensitivity assumptions</h2>
        <p>
          Change one assumption at a time. Other inputs and recorded actuals
          stay fixed. Rental income changes rent schedules; operating costs
          include management. Vacancy changes the economic vacancy rate, rather
          than lease dates. Exit cap shifts the effective cap; interest shifts
          entered loan and reset rates subject to existing caps.
        </p>
        <div className="adv-form">
          <label className="adv-field">
            Rent / operating cost change (%)
            <input
              type="number"
              min="0.1"
              max="99"
              step="0.5"
              value={Number.isFinite(settings.amount) ? settings.amount : ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  amount: e.target.value === "" ? NaN : Number(e.target.value),
                })
              }
            />
          </label>
          <label className="adv-field">
            Vacancy / exit cap / rate change (pp)
            <input
              type="number"
              min="0.01"
              max="10"
              step="0.1"
              value={Number.isFinite(settings.points) ? settings.points : ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  points: e.target.value === "" ? NaN : Number(e.target.value),
                })
              }
            />
          </label>
        </div>
        {!validTornado(settings) && (
          <p className="alert" role="alert">
            Enter a change above 0 and below 100%, and a percentage-point change
            above 0 and at most 10.
          </p>
        )}
      </section>
      <FinancialChart
        title="Sensitivity tornado"
        series={[
          "Lower assumption: return change",
          "Higher assumption: return change",
        ]}
        unit="points"
        rows={tornado.map((r) => ({
          label: `${r.label} ${r.assumption}`,
          values: [r.lower, r.higher],
        }))}
        source={source}
        note={`One assumption at a time; change in ${monthly ? "dated monthly XIRR" : "annual IRR"} from the current base, in percentage points (pp). Rent/cost ±${settings.amount}%; vacancy/cap/rate ±${settings.points} pp. Invalid or unsupported cases are N/A, never forced to a target.`}
      />
      {tornado.some((r) => r.lowerReason || r.higherReason) && (
        <details className="panel">
          <summary>Unavailable sensitivity cases</summary>
          {tornado
            .filter((r) => r.lowerReason || r.higherReason)
            .map((r) => (
              <p key={r.label}>
                {r.label}: lower: {r.lowerReason ?? "supported"}; higher —{" "}
                {r.higherReason ?? "supported"}.
              </p>
            ))}
        </details>
      )}
    </div>
  );
}
