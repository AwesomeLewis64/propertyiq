import type { Assumptions, Model } from "./types";
import { calculate } from "./model";
export function insights(
  a: Assumptions,
  m: Model,
): {
  title: string;
  detail: string;
  tone: "neutral" | "caution";
  target: string;
}[] {
  if (m.errors.length) return [];
  const y = m.years[0],
    out: {
      title: string;
      detail: string;
      tone: "neutral" | "caution";
      target: string;
    }[] = [];
  if (y.dscr !== null)
    out.push({
      title: `Year 1 debt coverage is ${y.dscr.toFixed(2)}x.`,
      detail: `NOI of $${Math.round(y.noi).toLocaleString()} covers annual debt service of $${Math.round(y.debt!.service).toLocaleString()}. A 1.25x reference is a comparison point, not a lender commitment.`,
      tone: y.dscr < 1.25 ? "caution" : "neutral",
      target: "debt",
    });
  if (y.egi > 0)
    out.push({
      title: `Operating expenses use ${((y.opex / y.egi) * 100).toFixed(1)}% of effective income.`,
      detail:
        "Includes management expenses; excludes reserves, capital expenditures and debt service. Review expense assumptions against property records.",
      tone: "neutral",
      target: "cash",
    });
  const stressed = calculate({
    ...a,
    exitCapMode: "manual",
    exitCap: Math.min(1, (m.effectiveExitCap ?? a.exitCap) + 0.005),
  });
  if (m.irr !== null && stressed.irr !== null)
    out.push({
      title: `A 50-basis-point higher exit cap changes IRR by ${((stressed.irr - m.irr) * 100).toFixed(2)} percentage points.`,
      detail:
        "All other assumptions are held constant. A higher cap rate reduces the terminal valuation at the same forward NOI.",
      tone: "neutral",
      target: "sensitivity",
    });
  const negative = m.years
    .slice(0, a.hold)
    .filter((y) => y.operatingCash !== null && y.operatingCash < 0);
  if (negative.length)
    out.push({
      title: `Negative operating equity cash flow in ${negative.length} modeled year${negative.length === 1 ? "" : "s"}.`,
      detail:
        "Additional equity may be needed. These cash outflows count as contributions in the equity multiple; sale proceeds are excluded from this check.",
      tone: "caution",
      target: "cash",
    });
  if (m.refinanceRequired)
    out.push({
      title: "Financing does not cover the full hold.",
      detail:
        "Refinancing assumptions are missing. Return metrics are withheld until loan maturity is at or beyond exit, or the debt is fully amortized.",
      tone: "caution",
      target: "debt",
    });
  return out;
}
