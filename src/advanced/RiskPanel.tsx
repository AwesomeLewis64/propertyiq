import { useEffect, useRef, useState } from "react";
import { forecast } from "./engine";
import type { ProjectEditor } from "./UnitEditor";
import type { RiskResult } from "./risk";
import { Card, NumberField, Metric } from "./Controls";
import { money, pct } from "../ui/format";
import TransitionSensitivity from "./TransitionSensitivity";
export default function RiskPanel({ p, set }: ProjectEditor) {
  const [result, setResult] = useState<RiskResult | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [stress, setStress] = useState({ delay: 3, cost: 1.2, rent: 0.9 }),
    [stressResult, setStressResult] = useState<ReturnType<
      typeof forecast
    > | null>(null);
  const active = useRef<Worker | null>(null);
  const signature = JSON.stringify(p);
  const [runSignature, setRunSignature] = useState("");
  const [stressSignature, setStressSignature] = useState("");
  const currentStressSignature = JSON.stringify([p, stress]);
  useEffect(() => () => active.current?.terminate(), []);
  const run = () => {
    active.current?.terminate();
    setBusy(true);
    setError("");
    setResult(null);
    setRunSignature(signature);
    const worker = new Worker(new URL("./risk.worker.ts", import.meta.url), {
      type: "module",
    });
    active.current = worker;
    worker.onmessage = (e) => {
      setBusy(false);
      if (e.data.error) setError(e.data.error);
      else setResult(e.data.result);
      worker.terminate();
    };
    worker.onerror = () => {
      setBusy(false);
      setError("Simulation worker failed.");
      worker.terminate();
    };
    worker.postMessage(p);
  };
  return (
    <>
      <TransitionSensitivity p={p} />
      <Card title="Combined downside stress">
        <div className="adv-form">
          <NumberField
            label="Renovation / delivery / sale delay months"
            value={stress.delay}
            onChange={(v) => setStress({ ...stress, delay: v })}
          />
          <NumberField
            label="Capital cost multiplier"
            value={stress.cost}
            onChange={(v) => setStress({ ...stress, cost: v })}
          />
          <NumberField
            label="Rent / unit sale price multiplier"
            value={stress.rent}
            onChange={(v) => setStress({ ...stress, rent: v })}
          />
        </div>
        <button
          className="button"
          onClick={() => {
            const scenario = structuredClone(p);
            scenario.actuals = [];
            scenario.units = scenario.units.map((u) => ({
              ...u,
              renovationMonth: u.renovationMonth
                ? u.renovationMonth + stress.delay
                : 0,
              availableMonth: u.availableMonth + stress.delay,
              targetMonth: u.targetMonth ? u.targetMonth + stress.delay : 0,
              saleMonth: u.saleMonth + stress.delay,
              renovationCost: u.renovationCost * stress.cost,
              rent: u.rent * stress.rent,
              targetRent: u.targetRent * stress.rent,
              renovatedRent: u.renovatedRent * stress.rent,
              marketRent: u.marketRent * stress.rent,
              salePrice: u.salePrice * stress.rent,
              events: u.events?.map((e) => ({
                ...e,
                month: e.month + stress.delay,
                amount:
                  e.kind === "rent" || e.kind === "lease"
                    ? e.amount * stress.rent
                    : e.amount,
              })),
            }));
            scenario.budget = scenario.budget.map((b) => ({
              ...b,
              start: b.start + stress.delay,
              amount: b.amount * stress.cost,
            }));
            setStressResult(forecast(scenario));
            setStressSignature(currentStressSignature);
          }}
        >
          Calculate combined stress
        </button>
        {stressResult && (
          <>
            {stressSignature !== currentStressSignature && (
              <p className="alert" role="status">
                Inputs changed after this stress calculation. Recalculate to
                update these results.
              </p>
            )}
            <div className="metrics adv-metrics">
              <Metric label="Stressed XIRR" value={pct(stressResult.irr)} />
              <Metric label="Stressed NPV" value={money(stressResult.npv)} />
              <Metric
                label="Additional owner funding"
                value={money(
                  stressResult.errors.length
                    ? null
                    : stressResult.additionalEquity,
                )}
              />
            </div>
            {stressResult.errors.map((e) => (
              <p className="negative" key={e}>
                {e}
              </p>
            ))}
          </>
        )}
      </Card>
      <Card
        title="Assumption-driven Monte Carlo"
        note="Uniform marginal ranges linked by an adverse-factor Gaussian dependence assumption. Repeatable seed. These probabilities describe your chosen model inputs, not observed market odds."
      >
        <div className="adv-form">
          {(
            [
              ["trials", "Simulation trials (10–500)", false],
              ["seed", "Random seed", false],
              ["rentLow", "Rent / sale price multiplier low", false],
              ["rentHigh", "Rent / sale price multiplier high", false],
              ["capLow", "Exit cap low", true],
              ["capHigh", "Exit cap high", true],
              ["costLow", "Capital cost multiplier low", false],
              ["costHigh", "Capital cost multiplier high", false],
              ["delayMax", "Maximum delay months", false],
              ["correlation", "Common adverse-factor dependence", true],
            ] as const
          ).map(([k, label, percent]) => (
            <NumberField
              key={k}
              label={label}
              value={p.risk[k]}
              percent={percent}
              onChange={(v) => set({ ...p, risk: { ...p.risk, [k]: v } })}
            />
          ))}
        </div>
        <div className="adv-actions">
          <button className="button primary" onClick={run} disabled={busy}>
            {busy ? "Simulating…" : "Run simulation"}
          </button>
          {busy && (
            <button
              className="button"
              onClick={() => {
                active.current?.terminate();
                setBusy(false);
              }}
            >
              Cancel simulation
            </button>
          )}
        </div>
        {error && <p className="alert error">{error}</p>}
        {result && (
          <>
            {runSignature !== signature && (
              <p className="alert">
                Inputs changed after this run. Rerun to update the simulation.
              </p>
            )}
            <div className="metrics adv-metrics">
              <Metric
                label="Negative NPV frequency"
                value={pct(result.lossProbability)}
              />
              <Metric
                label="Nominal capital-loss frequency"
                value={pct(result.capitalLossProbability)}
                note="Distributions below all contributions"
              />
              <Metric
                label="Additional funding frequency"
                value={pct(result.fundingProbability)}
              />
              <Metric
                label="Median supported XIRR"
                value={pct(result.irrMedian)}
              />
              <Metric
                label="P90 additional funding"
                value={money(result.callP90)}
              />
            </div>
            <p>
              NPV P10 {money(result.npvP10)} · P50 {money(result.npvP50)} · P90{" "}
              {money(result.npvP90)}.
            </p>
            <p>
              {result.valid} complete trials · {result.excluded} invalid or
              incomplete trials excluded. Frequencies are conditional on
              complete trials. Delays extending unit sales beyond the horizon
              can cause exclusion; expand the horizon to avoid hiding those
              cases.
            </p>
          </>
        )}
      </Card>
    </>
  );
}
