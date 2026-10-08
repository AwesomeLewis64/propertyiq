import { useMemo, useState } from "react";
import { Card, NumberField, TextField, Select } from "./Controls";
import type { ProjectEditor } from "./UnitEditor";
import { calendarEvents } from "./decisionAnalytics";
import { forecast } from "./engine";
import { dateAt } from "./returns";
import { money } from "../ui/format";
export default function CalendarPanel({ p }: ProjectEditor) {
  const [start, setStart] = useState(1),
    [find, setFind] = useState(""),
    [kind, setKind] = useState("all");
  const events = useMemo(() => calendarEvents(p), [p]),
    f = useMemo(() => forecast(p), [p]);
  const kinds = [...new Set(events.map((e) => e.kind))];
  const safeStart =
    Number.isInteger(start) && start >= 1 && start <= p.months ? start : 1;
  const months = Array.from(
    { length: Math.max(0, Math.min(12, p.months - safeStart + 1)) },
    (_, i) => safeStart + i,
  );
  const visible = events.filter(
    (e) =>
      e.end >= safeStart &&
      e.month < safeStart + months.length &&
      (kind === "all" || e.kind === kind) &&
      (!find ||
        `${e.unit} ${e.note}`.toLowerCase().includes(find.toLowerCase())),
  );
  if (f.errors.length)
    return (
      <Card title="Leasing, renovation and funding calendar">
        <p>Correct the project inputs above before displaying the calendar.</p>
      </Card>
    );
  return (
    <Card
      title="Leasing, renovation and funding calendar"
      note="A 12-month window connects unit events, project milestones and capital demand. Date labels follow the forecast start."
    >
      <div className="adv-form">
        <NumberField
          label="Calendar first forecast month"
          value={start}
          onChange={setStart}
          min={1}
          max={p.months}
        />
        <TextField
          label="Find unit, budget or milestone"
          value={find}
          onChange={setFind}
        />
        <Select
          label="Calendar event filter"
          value={kind}
          onChange={setKind}
          options={[
            ["all", "All event types"],
            ...kinds.map((k) => [k, k] as [string, string]),
          ]}
        />
      </div>
      <div className="table-scroll">
        <table className="decision-calendar">
          <thead>
            <tr>
              <th>Unit / project event</th>
              {months.map((m) => (
                <th key={m}>
                  {dateAt(p.startDate, m - 1).slice(0, 7)}
                  <small>Month {m}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, 500).map((e, i) => (
              <tr key={`${e.unit}-${e.month}-${e.kind}-${i}`}>
                <th>
                  {e.unit}
                  <small>
                    {e.kind}
                    {e.note ? ` · ${e.note}` : ""}
                  </small>
                </th>
                {months.map((m) => (
                  <td
                    key={m}
                    className={
                      m >= e.month && m <= e.end
                        ? `calendar-active calendar-${e.kind === "Renovation" || e.kind === "Capital budget" ? "spend" : e.kind === "Debt maturity" ? "debt" : "event"}`
                        : ""
                    }
                    title={
                      m >= e.month && m <= e.end
                        ? `${e.unit}: ${e.kind}, months ${e.month}–${e.end}, ${e.note}`
                        : ""
                    }
                  >
                    {m >= e.month && m <= e.end
                      ? e.kind === "Renovation"
                        ? "Offline"
                        : "●"
                      : ""}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th>Planned / posted CapEx</th>
              {months.map((m) => (
                <td key={m}>{money(f.rows[m - 1]?.capex)}</td>
              ))}
            </tr>
            <tr>
              <th>Owner cash calls</th>
              {months.map((m) => (
                <td
                  key={m}
                  className={
                    (f.rows[m - 1]?.capitalCall ?? 0) > 0
                      ? "calendar-active calendar-debt"
                      : ""
                  }
                >
                  {money(f.rows[m - 1]?.capitalCall)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {!visible.length && <p>No matching events in this window.</p>}
      {visible.length > 500 && (
        <p>First 500 events shown; narrow the filter.</p>
      )}
      <p>
        Scheduled events do not substantiate municipal approvals or contractor
        availability. Debt maturity remains fixed unless you explicitly change
        its terms.
      </p>
    </Card>
  );
}
