import { useMemo, useState } from "react";
import {
  buildGrid,
  defaultScenarios,
  type GridKind,
  type GridMetric,
  type ScenarioCell,
  type ScenarioOverrides,
} from "../finance/sensitivity";
import { calculate } from "../finance/model";
import type { Assumptions } from "../finance/types";
import { money, pct, multiple } from "./format";
const format = (value: number | null, metric: GridMetric) =>
  metric === "irr"
    ? pct(value)
    : metric === "dscr"
      ? multiple(value)
      : money(value);
export type ScenarioSettings = {
  upside: ScenarioOverrides;
  downside: ScenarioOverrides;
};
export function ScenarioComparison({
  a,
  editable = true,
  overrides,
  onChange,
}: {
  a: Assumptions;
  editable?: boolean;
  overrides: ScenarioSettings;
  onChange?: (value: ScenarioSettings) => void;
}) {
  const defaults = defaultScenarios(a);
  const scenarios = [
    { name: "Base case", a },
    { name: "Upside", a: { ...a, ...defaults.upside, ...overrides.upside } },
    {
      name: "Downside",
      a: { ...a, ...defaults.downside, ...overrides.downside },
    },
  ];
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>Scenario comparison</h2>
          <p>
            Hypothetical scenarios · other assumptions inherit the current base
            case
          </p>
        </div>
      </div>
      <div className="scenario-grid">
        {scenarios.map((s, i) => {
          const m = calculate(s.a);
          return (
            <article
              key={s.name}
              className={`scenario-card ${i === 0 ? "base" : ""}`}
            >
              <span className="eyebrow">{s.name}</span>
              <div className="scenario-return">
                <strong>{pct(m.irr)}</strong>
                <span>Annual IRR</span>
              </div>
              {(
                ["rentGrowth", "vacancy", "exitCap", "expenseGrowth"] as const
              ).map((k) => (
                <label key={k} className="scenario-field">
                  <span>
                    {k === "rentGrowth"
                      ? "Rent growth"
                      : k === "vacancy"
                        ? "Vacancy"
                        : k === "exitCap"
                          ? "Exit cap rate"
                          : "Expense growth"}
                  </span>
                  {i !== 0 && editable ? (
                    <div>
                      <input
                        aria-label={`${s.name} ${k}`}
                        inputMode="decimal"
                        type="number"
                        step="0.1"
                        value={
                          Number.isFinite(s.a[k])
                            ? Number((s.a[k] * 100).toFixed(5))
                            : ""
                        }
                        onChange={(e) => {
                          const key = i === 1 ? "upside" : "downside";
                          onChange?.({
                            ...overrides,
                            [key]: {
                              ...overrides[key],
                              [k]:
                                e.target.value === ""
                                  ? NaN
                                  : Number(e.target.value) / 100,
                            },
                          });
                        }}
                      />
                      %
                    </div>
                  ) : (
                    <strong>{pct(s.a[k])}</strong>
                  )}
                </label>
              ))}
              <div className="scenario-result">
                <span>Equity multiple</span>
                <strong>{multiple(m.multiple)}</strong>
              </div>
              <div className="scenario-result">
                <span>Exit-year NOI</span>
                <strong>{money(m.years[s.a.hold - 1]?.noi)}</strong>
              </div>
              <div className="scenario-result">
                <span>Initial equity</span>
                <strong>
                  {m.errors.length ? "N/A" : money(m.initialEquity)}
                </strong>
              </div>
              {m.errors.length > 0 && (
                <p className="negative">{m.errors.join(" ")}</p>
              )}
            </article>
          );
        })}
      </div>
      {editable && (
        <div className="panel-padding">
          <button
            className="text-button"
            onClick={() => onChange?.({ upside: {}, downside: {} })}
          >
            Reset scenario assumptions
          </button>
        </div>
      )}
    </section>
  );
}
export default function Sensitivity({
  a,
  onApply,
  scenarios,
  onScenarios,
}: {
  a: Assumptions;
  onApply: (a: Assumptions) => void;
  scenarios: ScenarioSettings;
  onScenarios: (value: ScenarioSettings) => void;
}) {
  const [kind, setKind] = useState<GridKind>("rent"),
    [metric, setMetric] = useState<GridMetric>("irr"),
    [selection, setSelection] = useState<{ row: number; col: number } | null>(
      null,
    );
  const grid = useMemo(() => buildGrid(a, kind, metric), [a, kind, metric]);
  const [target, setTarget] = useState(a.requiredReturn ?? 0.1);
  const selected: ScenarioCell | null = selection
    ? grid.cells[selection.row][selection.col]
    : null;
  const values = grid.cells
    .flat()
    .map((c) => c.value)
    .filter((v): v is number => v !== null);
  const min = Math.min(...values),
    max = Math.max(...values);
  const rowFormat = (v: number) => pct(v),
    colFormat = (v: number) =>
      kind === "debt" || kind === "value" ? money(v) : pct(v);
  return (
    <>
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Sensitivity analysis</h2>
            <p>
              Every IRR, coverage and equity cell uses a complete model
              recalculation.
            </p>
          </div>
          <span className="badge">25 scenarios</span>
        </div>
        <div className="sensitivity-controls">
          <label>
            Target IRR (%)
            <input
              aria-label="Sensitivity target IRR"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={target * 100}
              onChange={(e) => setTarget(Number(e.target.value) / 100)}
            />
          </label>
          <label>
            Compare
            <select
              aria-label="Sensitivity dimensions"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as GridKind);
                setSelection(null);
                setMetric("irr");
              }}
            >
              <option value="rent">Exit cap rate × rent growth</option>
              <option value="debt">Interest rate × acquisition price</option>
              <option value="vacancy">Vacancy × expense growth</option>
              <option value="value">Exit cap rate × forward NOI</option>
            </select>
          </label>
          {kind === "debt" && (
            <label>
              Metric
              <select
                aria-label="Sensitivity metric"
                value={metric === "equity" ? "equity" : "dscr"}
                onChange={(e) => setMetric(e.target.value as GridMetric)}
              >
                <option value="dscr">Year 1 DSCR</option>
                <option value="equity">Initial equity requirement</option>
              </select>
            </label>
          )}
          {kind === "vacancy" && (
            <label>
              Metric
              <select
                aria-label="Sensitivity metric"
                value={metric === "noi" ? "noi" : "irr"}
                onChange={(e) => setMetric(e.target.value as GridMetric)}
              >
                <option value="irr">Annual IRR</option>
                <option value="noi">Exit-year NOI</option>
              </select>
            </label>
          )}
        </div>
        {kind === "vacancy" && a.mode === "rentRoll" && (
          <div className="alert">
            Current rent-roll performance already reflects physical vacancy.
            This table therefore shows no vacancy-driven change; switch to
            manual mode to test economic vacancy on gross potential rent.
          </div>
        )}
        <div className="heatmap-label">
          <span>{grid.rowLabel} ↓</span>
          <span>{grid.colLabel} →</span>
        </div>
        <div className="table-scroll" tabIndex={0}>
          <table className="heatmap">
            <thead>
              <tr>
                <th>
                  {grid.metric === "irr"
                    ? "Annual IRR"
                    : grid.metric === "dscr"
                      ? "Year 1 DSCR"
                      : grid.metric === "equity"
                        ? "Initial equity"
                        : grid.metric === "noi"
                          ? "Exit-year NOI"
                          : "Gross exit value"}
                </th>
                {grid.cols.map((v, i) => (
                  <th key={i}>{colFormat(v)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.cells.map((row, ri) => (
                <tr key={ri}>
                  <th>{rowFormat(grid.rows[ri])}</th>
                  {row.map((cell, ci) => {
                    const ratio =
                      cell.value === null || max === min
                        ? 0.5
                        : (cell.value - min) / (max - min);
                    return (
                      <td key={ci}>
                        <button
                          className={ri === 2 && ci === 2 ? "base-cell" : ""}
                          style={{
                            background:
                              cell.value === null
                                ? "var(--color-surface-soft)"
                                : grid.metric === "irr"
                                  ? Math.abs(cell.value - target) < 0.0005
                                    ? "var(--color-surface-soft)"
                                    : cell.value < target
                                      ? "var(--color-danger-soft)"
                                      : "var(--color-success-soft)"
                                  : `color-mix(in srgb, var(--color-accent) ${8 + ratio * 24}%, var(--color-surface))`,
                          }}
                          aria-label={`${grid.rowLabel} ${rowFormat(cell.row)}, ${grid.colLabel} ${colFormat(cell.col)}: ${format(cell.value, grid.metric)}`}
                          aria-pressed={
                            selection?.row === ri && selection.col === ci
                          }
                          onClick={() => setSelection({ row: ri, col: ci })}
                        >
                          {format(cell.value, grid.metric)}
                          {ri === 2 && ci === 2 && <small>BASE</small>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="heatmap-footnote">
          {grid.metric === "irr" && (
            <p>
              Green: above {pct(target)} · Neutral: within 0.05 percentage
              points of target · Red: below target. Values remain visible
              without color.
            </p>
          )}
          {kind === "rent" && (
            <p>
              {grid.cells.filter(
                (row) => row[2].value !== null && row[2].value! < target,
              ).length
                ? `At base rent growth, return is below ${pct(target)} in tested exit-cap cases: ${grid.cells
                    .filter(
                      (row) => row[2].value !== null && row[2].value! < target,
                    )
                    .map((row) => pct(row[2].row))
                    .join(", ")}.`
                : `At base rent growth, all tested exit-cap cases meet ${pct(target)}. Expand assumptions to test a larger downside.`}
            </p>
          )}
          Click a cell to inspect its assumptions. Shading compares numerical
          values only; lower equity requirements are not automatically
          preferable. N/A cells are invalid, incomplete or ambiguous.
        </div>
        {selected && (
          <div className="scenario-selection">
            <div>
              <h3>Selected scenario</h3>
              <p>
                {grid.rowLabel}: {rowFormat(selected.row)} · {grid.colLabel}:{" "}
                {colFormat(selected.col)}
              </p>
              <strong>{format(selected.value, grid.metric)}</strong>
              {selected.model.errors.length > 0 && (
                <p>{selected.model.errors.join(" ")}</p>
              )}
              {selected.value === null && (
                <p>
                  {selected.model.irrReason ??
                    "A valid positive forward NOI is required."}
                </p>
              )}
            </div>
            {kind !== "value" ? (
              <div>
                <p>
                  Initial equity:{" "}
                  {selected.model.errors.length
                    ? "N/A"
                    : money(selected.model.initialEquity)}{" "}
                  · IRR: {pct(selected.model.irr)}
                </p>
                <button
                  className="button small"
                  disabled={selected.model.errors.length > 0}
                  onClick={() => onApply(selected.assumptions)}
                >
                  Apply scenario to base analysis
                </button>
              </div>
            ) : (
              <p>
                Terminal valuation only: forward NOI ÷ exit cap rate. Operating
                and financing assumptions are not changed by an independently
                specified NOI.
              </p>
            )}
          </div>
        )}
      </section>
      <ScenarioComparison a={a} overrides={scenarios} onChange={onScenarios} />
    </>
  );
}
