import { useId } from "react";
import { money } from "../ui/format";
export function NumberField({
  label,
  value,
  onChange,
  percent = false,
  min,
  max,
  help,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  percent?: boolean;
  min?: number;
  max?: number;
  help?: string;
}) {
  const id = useId();
  return (
    <label className="adv-field" htmlFor={id}>
      <span>
        {label}
        {percent ? " (%)" : ""}
      </span>
      <input
        id={id}
        type="number"
        step="any"
        min={min}
        max={max}
        value={
          Number.isFinite(value)
            ? Number((value * (percent ? 100 : 1)).toFixed(8))
            : ""
        }
        onChange={(e) =>
          onChange(
            e.target.value === ""
              ? NaN
              : Number(e.target.value) / (percent ? 100 : 1),
          )
        }
      />
      {help && <small>{help}</small>}
    </label>
  );
}
export function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const id = useId();
  return (
    <label className="adv-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="adv-toggle">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="adv-field">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map(([v, name]) => (
          <option value={v} key={v}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Card({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel adv-card">
      <div className="panel-title">
        <div>
          <h2>{title}</h2>
          {note && <p>{note}</p>}
        </div>
      </div>
      <div className="adv-card-body">{children}</div>
    </section>
  );
}
export function Metric({
  label,
  value,
  note,
  onInspect,
}: {
  label: string;
  value: string;
  note?: string;
  onInspect?: () => void;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
      {onInspect && (
        <button
          className="trace-calculation"
          onClick={onInspect}
          aria-label={`Trace ${label} calculation`}
        >
          Trace calculation ↗
        </button>
      )}
    </div>
  );
}
export function Plot({
  values,
  second,
  labels,
  title,
  seriesLabel = "Forecast",
  secondLabel = "Comparison",
  liquidation = false,
}: {
  values: number[];
  second?: number[];
  labels: string[];
  title: string;
  seriesLabel?: string;
  secondLabel?: string;
  liquidation?: boolean;
}) {
  if (!values.length) return null;
  const all = [...values, ...(second ?? [])],
    min = Math.min(0, ...all),
    max = Math.max(1, ...all),
    range = max - min;
  const path = (a: number[]) =>
    a
      .map(
        (v, i) =>
          `${i ? "L" : "M"} ${45 + (i * 710) / Math.max(1, a.length - 1)} ${170 - ((v - min) / range) * 140}`,
      )
      .join(" ");
  return (
    <figure className="adv-plot">
      <figcaption>{title}</figcaption>
      <div className="plot-legend">
        <span>━ {seriesLabel}</span>
        {second && <span>┄ {secondLabel}</span>}
      </div>
      <p className="plot-axis-label">USD · forecast month-end dates</p>
      <svg
        viewBox="0 0 800 210"
        role="img"
        aria-label={`${title}. First: ${money(values[0])}; last: ${money(values.at(-1))}. Exact values are in the monthly table.`}
      >
        <line
          x1="45"
          x2="755"
          y1={170 - ((0 - min) / range) * 140}
          y2={170 - ((0 - min) / range) * 140}
          stroke="#ced6df"
        />
        <path d={path(values)} fill="none" stroke="#142e58" strokeWidth="3" />
        {second && (
          <path
            d={path(second)}
            fill="none"
            stroke="#345e95"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
        )}
        <text x="45" y="200">
          {labels[0]}
        </text>
        <text x="650" y="200">
          {labels.at(-1)}
        </text>
        <text x="45" y="20">
          {money(max)}
        </text>
        <text x="45" y="185">
          {money(min)}
        </text>
      </svg>
      {liquidation && values.at(-1) === 0 && (
        <p className="plot-note">
          Final month: sale and liquidation distribute retained cash, bringing
          ending project cash to $0.
        </p>
      )}
    </figure>
  );
}
