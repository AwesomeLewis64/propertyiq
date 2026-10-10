import MoneyInput from "../ui/MoneyInput";
import FinancialChart from "../ui/FinancialChart";
import { useId } from "react";

export function NumberField({
  label,
  value,
  onChange,
  percent = false,
  currency = !percent &&
    /\b(amount|price|costs?|cash|equity|expenses?|rent|income|reserves?|funding|budget|proceeds|basis|depreciation|reimbursement|value|payment|balance|service|NOI|NPV|deposit|revenue|capex)\b/i.test(
      label,
    ) &&
    !/month|year|multiplier|ratio|change|growth|rate|frequency|yield|margin|multiple|days|unit count/i.test(
      label.replace(/monthly|annual|per unit|as-of/gi, ""),
    ),
  min,
  max,
  help,
  optional,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  percent?: boolean;
  currency?: boolean;
  min?: number;
  max?: number;
  help?: string;
  optional?: boolean;
}) {
  const id = useId();
  return (
    <label className="adv-field" htmlFor={id}>
      <span>
        {label}
        {percent ? " (%)" : ""}
      </span>
      {currency ? (
        <MoneyInput
          id={id}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          optional={optional}
        />
      ) : (
        <input
          id={id}
          aria-invalid={!optional && !Number.isFinite(value)}
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
      )}
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
  source,
}: {
  values: number[];
  second?: number[];
  labels: string[];
  title: string;
  seriesLabel?: string;
  secondLabel?: string;
  liquidation?: boolean;
  source?: string;
}) {
  return (
    <FinancialChart
      source={source}
      title={title}
      note={`USD · recorded forecast dates.${liquidation ? " Final liquidation releases retained cash after sale and financing obligations." : ""}`}
      series={second ? [seriesLabel, secondLabel] : [seriesLabel]}
      rows={values.map((v, i) => ({
        label: labels[i],
        values: second ? [v, second[i]] : [v],
      }))}
    />
  );
}
