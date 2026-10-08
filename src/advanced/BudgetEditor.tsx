import { Card, NumberField, TextField, Toggle, Select } from "./Controls";
import type { ProjectEditor } from "./UnitEditor";
import { uid } from "./defaults";
import type { Budget, Expense } from "./types";
import DevelopmentPlanner from "./DevelopmentPlanner";
export function Expenses({ p, set }: ProjectEditor) {
  return (
    <Card
      title="Expense schedules and reimbursements"
      note="Independent category growth, a scheduled reassessment/replacement, and monthly reimbursements. Replacement amounts grow from their effective month."
    >
      {p.expenses.map((e, i) => (
        <details className="adv-details" key={e.id} open={i === 0}>
          <summary>{e.name}</summary>
          <div className="adv-form">
            <TextField
              label="Category"
              value={e.name}
              onChange={(v) =>
                set({
                  ...p,
                  expenses: p.expenses.map((x, j) =>
                    i === j ? { ...x, name: v } : x,
                  ),
                })
              }
            />
            {(
              [
                ["annual", "Starting annual expense", false],
                ["growth", "Annual category growth", true],
                ["startMonth", "Expense start month", false],
                [
                  "changeMonth",
                  "Replacement effective month (0 = none)",
                  false,
                ],
                [
                  "replacementAnnual",
                  "New annual amount at replacement",
                  false,
                ],
                ["reimbursement", "Monthly reimbursement income", false],
              ] as const
            ).map(([k, label, percent]) => (
              <NumberField
                key={k}
                label={label}
                value={e[k]}
                percent={percent}
                onChange={(v) =>
                  set({
                    ...p,
                    expenses: p.expenses.map((x, j) =>
                      j === i ? ({ ...x, [k]: v } as Expense) : x,
                    ),
                  })
                }
              />
            ))}
          </div>
          <button
            className="button small"
            onClick={() =>
              set({ ...p, expenses: p.expenses.filter((_, j) => j !== i) })
            }
          >
            Remove category
          </button>
        </details>
      ))}
      <button
        className="button"
        onClick={() =>
          set({
            ...p,
            expenses: [
              ...p.expenses,
              {
                id: uid(),
                name: "New expense",
                annual: 0,
                growth: 0.03,
                startMonth: 1,
                changeMonth: 0,
                replacementAnnual: 0,
                reimbursement: 0,
              },
            ],
          })
        }
      >
        Add expense category
      </button>
    </Card>
  );
}
export function Development({ p, set }: ProjectEditor) {
  const dev = p.strategy.startsWith("development");
  return (
    <>
      <Card
        title="Construction, renovation and development budget"
        note="Costs spread evenly over each line's selected months. Loan draws fund eligible costs within the commitment; contingency is included in modeled spending."
      >
        <p>
          {dev
            ? "Use the unit schedule to set delivery, lease-up and individual sale months."
            : "Rental renovation costs can be entered per unit; use these lines for common-area or other phased capital projects. Avoid entering the same cost twice."}
        </p>
        <div className="adv-form">
          <NumberField
            label="Cost contingency"
            value={p.contingency}
            percent
            onChange={(v) => set({ ...p, contingency: v })}
          />
          <Select
            label="Project strategy"
            value={p.strategy}
            onChange={(v) => set({ ...p, strategy: v as typeof p.strategy })}
            options={[
              ["acquisition", "Rental acquisition"],
              ["existing", "Existing rental property"],
              ["development-sale", "Develop and sell individual units"],
              ["development-hold", "Develop and hold rental units"],
            ]}
          />
        </div>
        {p.budget.map((b, i) => (
          <details className="adv-details" key={b.id} open={i === 0}>
            <summary>{b.name}</summary>
            <div className="adv-form">
              <TextField
                label="Budget line"
                value={b.name}
                onChange={(v) =>
                  set({
                    ...p,
                    budget: p.budget.map((x, j) =>
                      j === i ? { ...x, name: v } : x,
                    ),
                  })
                }
              />
              <Select
                label="Cost type"
                value={b.category}
                onChange={(v) =>
                  set({
                    ...p,
                    budget: p.budget.map((x, j) =>
                      j === i ? { ...x, category: v as Budget["category"] } : x,
                    ),
                  })
                }
                options={[
                  ["hard", "Hard costs"],
                  ["soft", "Soft costs"],
                  ["other", "Other capital spending"],
                ]}
              />
              {(
                [
                  ["amount", "Amount before contingency"],
                  ["start", "Spending start month"],
                  ["duration", "Spending duration months"],
                ] as const
              ).map(([k, label]) => (
                <NumberField
                  key={k}
                  label={label}
                  value={b[k]}
                  onChange={(v) =>
                    set({
                      ...p,
                      budget: p.budget.map((x, j) =>
                        j === i ? { ...x, [k]: v } : x,
                      ),
                    })
                  }
                />
              ))}
              <Toggle
                label="Eligible for construction debt draws"
                value={b.debtEligible}
                onChange={(v) =>
                  set({
                    ...p,
                    budget: p.budget.map((x, j) =>
                      j === i ? { ...x, debtEligible: v } : x,
                    ),
                  })
                }
              />
            </div>
            <button
              className="button small"
              onClick={() =>
                set({ ...p, budget: p.budget.filter((_, j) => j !== i) })
              }
            >
              Remove budget line
            </button>
          </details>
        ))}
        <button
          className="button"
          onClick={() =>
            set({
              ...p,
              budget: [
                ...p.budget,
                {
                  id: uid(),
                  name: "New capital budget",
                  category: "hard",
                  amount: 0,
                  start: 1,
                  duration: 12,
                  debtEligible: true,
                },
              ],
            })
          }
        >
          Add budget line
        </button>
      </Card>
      <Card title="Construction model conventions">
        <p>
          Land/acquisition cost is funded at the start. Eligible construction
          costs draw at the start of each month; interest is charged on the
          resulting balance. Capitalized interest uses the remaining loan
          commitment; any excess is paid in cash. Unit sales happen at month-end
          and release debt according to the entered percentage. Rental
          development can refinance into a permanent loan on its scheduled
          month.
        </p>
        <p>
          Undrawn commitments are not cash. Sale dates and amounts must be
          entered for every unit in a sales project. No assumption is made that
          approval, construction completion or a sale is guaranteed. Retainage,
          lien releases and lender inspections belong in the diligence
          checklist.
        </p>
      </Card>
      <DevelopmentPlanner p={p} set={set} />
    </>
  );
}
