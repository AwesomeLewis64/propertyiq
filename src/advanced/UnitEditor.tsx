import { useState } from "react";
import type { Project, Unit } from "./types";
import { newUnit } from "./defaults";
import { Card, NumberField, Toggle, TextField, Select } from "./Controls";
import { money, pct } from "../ui/format";
import LeaseEvents from "./LeaseEvents";
export type ProjectEditor = { p: Project; set: (p: Project) => void };
export default function UnitEditor({ p, set }: ProjectEditor) {
  const [index, setIndex] = useState(0),
    [filter, setFilter] = useState("");
  const unit = p.units[Math.min(index, p.units.length - 1)];
  const update = (key: keyof Unit, value: Unit[keyof Unit]) =>
    set({
      ...p,
      units: p.units.map((u, i) => (i === index ? { ...u, [key]: value } : u)),
    });
  const add = () => {
    let n = p.units.length + 1;
    while (p.units.some((u) => u.id === String(n))) n++;
    set({ ...p, units: [...p.units, newUnit(n)] });
    setIndex(p.units.length);
  };
  const number = (key: keyof Unit, label: string, percent = false) => (
    <NumberField
      key={key}
      label={label}
      value={unit[key] as number}
      percent={percent}
      onChange={(v) => update(key, v)}
    />
  );
  return (
    <>
      <Card
        title="Unit-by-unit leasing and renovation"
        note="Month 1 is the first forecast month. Month 0 disables a renovation, target rent or lease event. Renovation downtime supersedes occupancy; renewal events follow the initial lease end."
      >
        <div className="adv-actions">
          <button
            className="button"
            onClick={add}
            disabled={p.units.length >= 500}
          >
            Add unit
          </button>
          <TextField label="Find unit" value={filter} onChange={setFilter} />
          <span>
            {p.units.length} units ·{" "}
            {pct(p.units.filter((u) => u.occupied).length / p.units.length)}{" "}
            initially occupied
          </span>
        </div>
        <div className="adv-unit-layout">
          <div className="adv-unit-list" role="group" aria-label="Units">
            {p.units.map((u, i) =>
              !filter || u.id.toLowerCase().includes(filter.toLowerCase()) ? (
                <button
                  key={u.id + i}
                  aria-pressed={i === index}
                  onClick={() => setIndex(i)}
                  className={i === index ? "selected" : ""}
                >
                  Unit {u.id}
                  <small>
                    {money(u.rent)} →{" "}
                    {money(u.targetMonth ? u.targetRent : u.renovatedRent)}
                  </small>
                </button>
              ) : null,
            )}
          </div>
          {unit && (
            <div>
              <div className="adv-form">
                <TextField
                  label="Unit ID"
                  value={unit.id}
                  onChange={(v) => update("id", v)}
                />
                <Toggle
                  label="Occupied at forecast start"
                  value={unit.occupied}
                  onChange={(v) => update("occupied", v)}
                />
                <Toggle
                  label="Include planned renovation"
                  value={unit.renovationEnabled !== false}
                  onChange={(v) => update("renovationEnabled", v)}
                />
                {number("rent", "Current monthly rent")}
                {number(
                  "marketRent",
                  "Market monthly rent / vacant lease-up rent",
                )}
                {number(
                  "availableMonth",
                  "First available month (if vacant / development)",
                )}
                {number("leaseEnd", "Initial lease end month")}
                <Select
                  label="After initial lease expires"
                  value={unit.renewal}
                  onChange={(v) => update("renewal", v as Unit["renewal"])}
                  options={[
                    ["renew", "Renew; annual renewal increases"],
                    ["vacate", "Vacate; relet at market rent"],
                  ]}
                />
                {number("renewalIncrease", "Renewal increase", true)}
                {number("turnoverMonths", "Turnover downtime months")}
                {number("renovationMonth", "Renovation start month")}
                {number(
                  "renovationMonths",
                  "Renovation downtime / spending months",
                )}
                {number(
                  "renovationCost",
                  "Renovation budget before contingency",
                )}
                {number("renovatedRent", "Monthly rent after renovation")}
                {number("targetMonth", "Target rent effective month")}
                {number("targetRent", "Target monthly rent")}
                {number("concession", "Monthly concession at lease-up")}
                {number("concessionMonths", "Concession months")}
                {p.strategy === "development-sale" && (
                  <>
                    {number("saleMonth", "Unit sale month")}
                    {number("salePrice", "Gross unit sale price")}
                  </>
                )}
              </div>
              <LeaseEvents
                unit={unit}
                update={(events) => update("events", events)}
              />
              <button
                className="button small"
                disabled={p.units.length <= 1}
                onClick={() => {
                  set({ ...p, units: p.units.filter((_, i) => i !== index) });
                  setIndex(Math.max(0, index - 1));
                }}
              >
                Remove this unit
              </button>
            </div>
          )}
        </div>
      </Card>
      <Card title="How rent events interact">
        <p>
          Initially vacant units lease at entered market rent from their
          availability month. Renovation completion, target rent and re-leasing
          are dated rent events: the latest event sets the rent. Entered event
          rents apply at their stated amount in that month; subsequent general
          growth and renewal increases apply afterward. Renovation downtime
          overrides all rent events. Use zero general growth when explicit
          targets and renewals already incorporate all growth.
        </p>
        <p>
          Sale projects use unit sale schedules instead of rental income. No
          tenant names or contact details are needed.
        </p>
      </Card>
    </>
  );
}
