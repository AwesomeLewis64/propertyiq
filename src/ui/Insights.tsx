import type { Assumptions, Model } from "../finance/types";
import { insights } from "../finance/insights";
export default function Insights({
  a,
  m,
  onNavigate,
}: {
  a: Assumptions;
  m: Model;
  onNavigate: (view: string) => void;
}) {
  return (
    <section className="panel insights">
      <div className="panel-title">
        <div>
          <h2>Investment insights</h2>
          <p>
            Transparent rules from the current model · hypothetical analysis
          </p>
        </div>
        <span className="badge">Rule-based</span>
      </div>
      <div className="insight-list">
        {insights(a, m).map((item) => (
          <article key={item.title}>
            <span className={`insight-dot ${item.tone}`} />
            <div>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
              <button
                className="text-button"
                onClick={() => onNavigate(item.target)}
              >
                Inspect the calculation →
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
