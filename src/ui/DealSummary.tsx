import { ArrowDownRight, CircleCheck, CircleAlert } from "lucide-react";
import type { Assumptions, Model } from "../finance/types";
import { money, pct, multiple } from "./format";
import { criteriaOf, judge, quickActuals } from "../finance/criteria";
import Targets from "./Targets";

export type SummaryTarget = "overview" | "cash" | "debt";

/**
 * The answers at a glance, pinned above the results: target verdict plus the
 * five figures people look for first. Each one jumps to where it is explained.
 */
export default function DealSummary({
  a,
  m,
  onGo,
}: {
  a: Assumptions;
  m: Model;
  onGo: (view: SummaryTarget) => void;
}) {
  const y = m.years[0];
  const target = a.requiredReturn ?? 0.1;
  const meets = m.irr !== null && m.irr >= target;
  // The IRR target is the verdict above; list only the other targets that are set.
  const targets = judge(
    undefined,
    criteriaOf(a.criteria),
    quickActuals(m),
  ).filter((t) => t.target !== undefined);
  const items: [string, string, SummaryTarget, string][] = [
    ["Annual IRR", pct(m.irr), "overview", "Return details"],
    ["Year 1 NOI", money(y.noi), "cash", "Cash flows"],
    ["DSCR", multiple(y.dscr), "debt", "Debt schedule"],
    [
      "Cash-on-cash",
      pct(y.operatingCash !== null ? y.operatingCash / m.initialEquity : null),
      "cash",
      "Cash flows",
    ],
    ["Equity needed", money(m.initialEquity), "overview", "Return details"],
  ];
  return (
    <nav className="deal-summary" aria-label="Deal summary">
      <p className="deal-summary-verdict" data-meets={meets ? "" : undefined}>
        {meets ? (
          <CircleCheck size={16} aria-hidden="true" />
        ) : (
          <CircleAlert size={16} aria-hidden="true" />
        )}
        {m.irr === null
          ? "IRR not available"
          : `IRR ${m.irr > target ? "above" : m.irr === target ? "at" : "below"} ${Number((target * 100).toFixed(2))}% target`}
      </p>
      <ul className="deal-summary-figures">
        {items.map(([label, value, view, where]) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => onGo(view)}
              title={`Go to ${where.toLowerCase()}`}
            >
              <span>{label}</span>
              <strong>{value}</strong>
              <ArrowDownRight size={13} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {targets.length > 0 && <Targets targets={targets} />}
    </nav>
  );
}
