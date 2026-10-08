import { pct, multiple } from "./format";
export function verdictLines(
  coverage: number | null,
  value: number | null,
  target: number,
  goingCap: number,
  exitCap: number,
): string[] {
  return [
    coverage === null
      ? "Debt coverage is unavailable for this case."
      : `Cash flow covers regular debt service ${multiple(coverage)}.`,
    value === null
      ? "Return is unavailable until the model is complete."
      : `Projected return ${pct(value)} is ${value >= target ? "above" : "below"} your ${pct(target)} target.`,
    `Exit cap ${pct(exitCap)} ${exitCap < goingCap ? "assumes cap-rate compression" : exitCap === goingCap ? "holds cap rates flat" : "assumes cap rates expand"} from ${pct(goingCap)} going-in.`,
  ];
}
export default function Verdict({
  lines,
  engine,
}: {
  lines: string[];
  engine: string;
}) {
  return (
    <section className="verdict-strip" aria-label="Analysis interpretation">
      <strong>{engine}</strong>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </section>
  );
}
