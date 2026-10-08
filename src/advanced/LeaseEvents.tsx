import type { Unit, LeaseEvent } from "./types";
import { NumberField, TextField, Select } from "./Controls";
import { uid } from "./defaults";
export default function LeaseEvents({
  unit,
  update,
}: {
  unit: Unit;
  update: (events: LeaseEvent[]) => void;
}) {
  const events = unit.events ?? [];
  const set = (id: string, patch: Partial<LeaseEvent>) =>
    update(events.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  return (
    <details className="adv-details">
      <summary>Multiple dated lease events ({events.length})</summary>
      <p>
        Explicit rent / lease events set the monthly rent and override the
        automatic rent path from their date onward. General rent growth follows
        the latest explicit rent. Vacancies block rent for their duration; a
        later lease restarts occupancy. Renovation downtime still blocks rent.
        Concessions apply for their duration. Review event dates against
        existing targets and renewal assumptions.
      </p>
      {events.map((e) => (
        <div className="adv-task" key={e.id}>
          <div className="adv-form">
            <Select
              label="Lease event type"
              value={e.kind}
              onChange={(v) => set(e.id, { kind: v as LeaseEvent["kind"] })}
              options={[
                ["rent", "Rent change / renewal"],
                ["lease", "Lease / relet"],
                ["vacant", "Vacancy / turnover"],
                ["concession", "Concession"],
              ]}
            />
            <NumberField
              label="Event forecast month"
              value={e.month}
              onChange={(v) => set(e.id, { month: v })}
            />
            <NumberField
              label="Monthly rent or concession"
              value={e.amount}
              onChange={(v) => set(e.id, { amount: v })}
            />
            <NumberField
              label="Vacancy / concession duration"
              value={e.duration}
              onChange={(v) => set(e.id, { duration: v })}
            />
            <TextField
              label="Lease event note"
              value={e.note}
              onChange={(v) => set(e.id, { note: v })}
            />
          </div>
          <button
            className="button small"
            onClick={() => update(events.filter((x) => x.id !== e.id))}
          >
            Remove event
          </button>
        </div>
      ))}
      <button
        className="button"
        disabled={events.length >= 500}
        onClick={() =>
          update([
            ...events,
            {
              id: uid(),
              month: 1,
              kind: "rent",
              amount: unit.rent,
              duration: 1,
              note: "",
            },
          ])
        }
      >
        Add dated lease event
      </button>
    </details>
  );
}
