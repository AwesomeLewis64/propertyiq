import { CircleCheck, CircleAlert, CircleHelp } from "lucide-react";
import type { Target } from "../finance/criteria";
import { money, pct, multiple } from "./format";

export const targetValue = (key: Target["key"], v: number) =>
  key === "equity" ? money(v) : key === "dscr" ? multiple(v) : pct(v);
const words = {
  meets: "Meets",
  misses: "Misses",
  unknown: "Not enough information",
};
const icons = { meets: CircleCheck, misses: CircleAlert, unknown: CircleHelp };

/** Each saved target with its state in words and an icon, never color alone. */
export default function Targets({ targets }: { targets: Target[] }) {
  return (
    <ul className="targets" aria-label="Investment criteria">
      {targets.map((t) => {
        const Icon = icons[t.state];
        return (
          <li key={t.key} data-state={t.state}>
            <Icon size={16} aria-hidden="true" />
            <span>
              {t.label}
              {t.target !== undefined && `: ${targetValue(t.key, t.target)}`}
            </span>
            <strong>{words[t.state]}</strong>
            <small>
              {t.target === undefined
                ? "No target set"
                : t.actual === null
                  ? "This figure cannot be calculated from the current inputs"
                  : `This deal: ${targetValue(t.key, t.actual)}`}
            </small>
          </li>
        );
      })}
    </ul>
  );
}
