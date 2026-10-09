import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { demo } from "../finance/demo";
import { calculate } from "../finance/model";
import { money, pct, multiple } from "./format";

/**
 * Start-page story (docs/adr/0005): three steps on the left, one sticky card on
 * the right that changes with the step in view. Figures are the fictional
 * sample property run through the real model. Phones get one card per step.
 */
export default function StoryCard({ onReport }: { onReport: () => void }) {
  const [step, setStep] = useState(0);
  const steps = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting)
            setStep(Number((e.target as HTMLElement).dataset.step));
      },
      // A step is current while it crosses the middle band of the viewport.
      { rootMargin: "-45% 0px -45% 0px" },
    );
    steps.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const m = calculate(demo);
  const y1 = m.years[0];
  const views: { title: string; body: string; card: ReactNode }[] = [
    {
      title: "Enter property inputs",
      body: "Enter a few figures, describe a property, or map a spreadsheet. Review every input before it enters your analysis.",
      card: (
        <dl className="iq-story-fields">
          {[
            ["Purchase price", money(demo.price)],
            ["Units", String(demo.units)],
            ["Rent per unit", `${money(demo.rent)}/mo`],
            ["Loan", `${pct(demo.ltv)} LTV at ${pct(demo.rate)}`],
            ["Hold", `${demo.hold} years`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {value}
                <Check size={14} aria-hidden="true" />
              </dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      title: "Review cash flow",
      body: "Follow income, expenses, loan payments and your forecast period. Compare scenarios and see when more cash is needed.",
      card: (
        <>
          <div className="iq-sample-metrics">
            {[
              ["Annual potential rent", y1.grossRent],
              ["Operating expenses", y1.opex],
              ["Net operating income", y1.noi],
            ].map(([label, n]) => (
              <div key={label as string}>
                <span>{label}</span>
                <strong>{money(n as number)}</strong>
              </div>
            ))}
          </div>
          <div
            className="iq-income-bar"
            role="img"
            aria-label={`Illustrative NOI ${money(y1.noi)}; operating expenses ${money(y1.opex)}`}
            style={{ "--noi": y1.noi / (y1.noi + y1.opex) } as CSSProperties}
          >
            <span />
            <span />
          </div>
          <div className="iq-bar-legend">
            <span>
              <i />
              Net operating income &nbsp; {money(y1.noi)}
            </span>
            <span>
              <i />
              Operating expenses &nbsp; {money(y1.opex)}
            </span>
          </div>
        </>
      ),
    },
    {
      title: "Check the assumptions",
      body: "Trace calculations, connect source documents and compare against your workbook. Build a report you can explain.",
      card: (
        <>
          <dl className="iq-story-fields">
            {[
              ["Vacancy", pct(demo.vacancy)],
              ["Rent growth", `${pct(demo.rentGrowth)} / yr`],
              ["Expense growth", `${pct(demo.expenseGrowth)} / yr`],
              ["Exit cap rate", pct(m.effectiveExitCap ?? demo.exitCap)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="iq-story-result">
            <span>
              Annual IRR <strong>{pct(m.irr)}</strong>
            </span>
            <span>
              Year 1 DSCR <strong>{multiple(y1.dscr)}</strong>
            </span>
          </p>
        </>
      ),
    },
  ];
  const head = (
    <div className="iq-sample-heading">
      <div>
        <h3>{demo.name}</h3>
        <p>{demo.units}-unit multifamily · Fictional value-add case</p>
      </div>
      <button className="iq-text-link" onClick={onReport}>
        View sample report <ArrowUpRight size={15} />
      </button>
    </div>
  );
  const foot = (
    <small>Based on illustrative inputs, not a sourced market deal.</small>
  );

  return (
    <section className="iq-story" id="how-it-works">
      <h2 data-reveal="">Three steps to a property analysis.</h2>
      <div className="iq-story-grid">
        <div className="iq-story-steps">
          {views.map((v, i) => (
            <article
              key={v.title}
              className="iq-story-step"
              data-step={i}
              data-active={step === i ? "" : undefined}
              ref={(el) => {
                steps.current[i] = el;
              }}
            >
              <div data-reveal="">
                <span className="iq-story-index">Step {i + 1} of 3</span>
                <h3>{v.title}</h3>
                <p>{v.body}</p>
              </div>
              {/* Phones: each step carries its own card. */}
              <div className="iq-sample-card iq-story-inline" data-reveal="">
                {head}
                {v.card}
                {foot}
              </div>
            </article>
          ))}
        </div>
        {/* Wide screens: one pinned card that changes with the step. */}
        <div className="iq-story-pin">
          <article className="iq-sample-card iq-story-card" data-step={step}>
            {head}
            <div className="iq-story-layers">
              {views.map((v, i) => (
                <div
                  key={v.title}
                  className="iq-story-layer"
                  data-active={step === i ? "" : undefined}
                  aria-hidden={step === i ? undefined : true}
                  inert={step !== i}
                >
                  {v.card}
                </div>
              ))}
            </div>
            <ol className="iq-story-dots" aria-label="Story steps">
              {views.map((v, i) => (
                <li
                  key={v.title}
                  aria-current={step === i ? "step" : undefined}
                >
                  <span className="sr-only">{v.title}</span>
                </li>
              ))}
            </ol>
            {foot}
          </article>
        </div>
      </div>
    </section>
  );
}
