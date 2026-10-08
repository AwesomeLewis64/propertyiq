import type { Project } from "./types";
import { forecast } from "./engine";
export type RiskResult = {
  valid: number;
  excluded: number;
  lossProbability: number | null;
  capitalLossProbability: number | null;
  fundingProbability: number | null;
  irrMedian: number | null;
  npvP10: number | null;
  npvP50: number | null;
  npvP90: number | null;
  callP90: number | null;
  points: { npv: number; call: number; irr: number | null; profit: number }[];
};
export function simulate(p: Project): RiskResult {
  const r = p.risk;
  if (
    !Number.isInteger(r.trials) ||
    r.trials < 10 ||
    r.trials > 500 ||
    r.rentLow < 0 ||
    r.rentHigh < r.rentLow ||
    r.capLow <= 0 ||
    r.capHigh < r.capLow ||
    r.costLow < 0 ||
    r.costHigh < r.costLow ||
    r.delayMax < 0 ||
    r.correlation < 0 ||
    r.correlation > 1
  )
    throw new Error(
      "Use 10–500 trials, ordered nonnegative ranges, positive cap rates, and dependence 0–100%.",
    );
  let seed = r.seed >>> 0;
  const uniform = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return (seed + 0.5) / 4294967296;
  };
  const normal = () =>
    Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform());
  const cdf = (z: number) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804 * Math.exp((-z * z) / 2);
    const q =
      d *
      t *
      (0.31938153 +
        t *
          (-0.356563782 +
            t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return z >= 0 ? 1 - q : q;
  };
  const points: RiskResult["points"] = [];
  let excluded = 0;
  for (let i = 0; i < r.trials; i++) {
    const common = normal(),
      adverse = () =>
        cdf(
          Math.sqrt(r.correlation) * common +
            Math.sqrt(1 - r.correlation) * normal(),
        ),
      rent = r.rentLow + (r.rentHigh - r.rentLow) * (1 - adverse()),
      cap = r.capLow + (r.capHigh - r.capLow) * adverse(),
      cost = r.costLow + (r.costHigh - r.costLow) * adverse(),
      delay = Math.floor(adverse() * (Math.floor(r.delayMax) + 1));
    const scenario = structuredClone(p);
    scenario.actuals = [];
    scenario.exitCap = cap;
    scenario.units = scenario.units.map((u) => ({
      ...u,
      rent: u.rent * rent,
      marketRent: u.marketRent * rent,
      targetRent: u.targetRent * rent,
      renovatedRent: u.renovatedRent * rent,
      renovationCost: u.renovationCost * cost,
      renovationMonth: u.renovationMonth ? u.renovationMonth + delay : 0,
      availableMonth: u.availableMonth + delay,
      targetMonth: u.targetMonth ? u.targetMonth + delay : 0,
      saleMonth: u.saleMonth + delay,
      salePrice: u.salePrice * rent,
      events: u.events?.map((e) => ({
        ...e,
        month: e.month + delay,
        amount:
          e.kind === "rent" || e.kind === "lease" ? e.amount * rent : e.amount,
      })),
    }));
    scenario.budget = scenario.budget.map((b) => ({
      ...b,
      amount: b.amount * cost,
      start: b.start + delay,
    }));
    const model = forecast(scenario);
    if (model.errors.length || model.npv === null) {
      excluded++;
      continue;
    }
    points.push({
      npv: model.npv,
      call: model.additionalEquity,
      irr: model.irr,
      profit: model.totalProfit,
    });
  }
  const quantile = (values: number[], q: number) => {
    const a = values.sort((a, b) => a - b);
    if (!a.length) return null;
    const index = (a.length - 1) * q,
      lo = Math.floor(index);
    return a[lo] + (a[Math.ceil(index)] - a[lo]) * (index - lo);
  };
  return {
    valid: points.length,
    excluded,
    lossProbability: points.length
      ? points.filter((v) => v.npv < 0).length / points.length
      : null,
    capitalLossProbability: points.length
      ? points.filter((v) => v.profit < 0).length / points.length
      : null,
    fundingProbability: points.length
      ? points.filter((v) => v.call > 0.01).length / points.length
      : null,
    irrMedian: quantile(
      points.flatMap((v) => (v.irr === null ? [] : [v.irr])),
      0.5,
    ),
    npvP10: quantile(
      points.map((v) => v.npv),
      0.1,
    ),
    npvP50: quantile(
      points.map((v) => v.npv),
      0.5,
    ),
    npvP90: quantile(
      points.map((v) => v.npv),
      0.9,
    ),
    callP90: quantile(
      points.map((v) => v.call),
      0.9,
    ),
    points,
  };
}
