import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { expenseKeys, type Assumptions } from "../finance/types";
import { calculate } from "../finance/model";
const expenseLabels = {
  taxes: "Property taxes",
  insurance: "Insurance",
  repairs: "Repairs & maintenance",
  utilities: "Utilities",
  payroll: "Payroll",
  administration: "Administration",
  marketing: "Marketing",
  other: "Other expenses",
};
function NumberField({
  label,
  value,
  onChange,
  percent = false,
  suffix = "",
  help = "",
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  percent?: boolean;
  suffix?: string;
  help?: string;
}) {
  const [draft, setDraft] = useState(
    suffix.includes("$")
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2,
        }).format(value)
      : String(percent ? Number((value * 100).toFixed(8)) : value),
  );
  const emitted = useRef<{ value: number; percent: boolean } | null>(null);
  useEffect(() => {
    // Preserve partially typed values (such as '-' or '3.') on our own updates.
    // Only an external reset/load or formatting-mode change replaces the draft.
    if (
      emitted.current?.percent === percent &&
      Object.is(emitted.current.value, value)
    )
      return;
    setDraft(
      Number.isFinite(value)
        ? suffix.includes("$")
          ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 2,
            }).format(value)
          : String(percent ? Number((value * 100).toFixed(8)) : value)
        : "",
    );
  }, [value, percent, suffix]);
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-wrap">
        <input
          aria-label={label}
          aria-invalid={!Number.isFinite(value)}
          inputMode="decimal"
          value={draft}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => {
            if (Number.isFinite(value) && suffix.includes("$"))
              setDraft(
                new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 2,
                }).format(value),
              );
          }}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            const clean = raw.replace(/[$,%\s]/g, "");
            const next =
              clean === "" ? NaN : Number(clean) / (percent ? 100 : 1);
            emitted.current = { value: next, percent };
            onChange(next);
          }}
        />
        <span className="suffix">{percent ? "%" : suffix}</span>
      </div>
      {help && <small>{help}</small>}
    </label>
  );
}
export default function Inputs({
  a,
  set,
}: {
  a: Assumptions;
  set: (a: Assumptions) => void;
}) {
  const update = <K extends keyof Assumptions>(key: K, value: Assumptions[K]) =>
    set({ ...a, [key]: value });
  const field = (
    key: keyof Assumptions,
    label: string,
    percent = false,
    suffix = "",
    help = "",
  ) => (
    <NumberField
      key={key}
      label={label}
      value={(a[key] ?? 0) as number}
      percent={percent}
      suffix={suffix}
      help={help}
      onChange={(v) => update(key, v)}
    />
  );
  return (
    <div className="assumptions">
      <div className="section-heading">
        <h2>Assumptions</h2>
        <span>USD · Annual model</span>
      </div>
      <details open>
        <summary>
          Property & acquisition
          <ChevronDown size={15} />
        </summary>
        <div className="input-section">
          <label className="field">
            <span>Property name</span>
            <input
              value={a.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </label>
          <label className="field">
            <span>City, state</span>
            <input
              value={a.location}
              onChange={(e) => update("location", e.target.value)}
            />
          </label>
          {field("units", "Residential units")}
          {field("price", "Acquisition price", false, "$")}
          {field("closingCosts", "Closing costs", false, "$")}
          {field("initialCapex", "Initial capital budget", false, "$")}
        </div>
      </details>
      <details open>
        <summary>
          Income & growth
          <ChevronDown size={15} />
        </summary>
        <div className="input-section">
          {a.mode === "rentRoll" ? (
            <div className="notice">
              Current rent-roll mode. Occupied contractual rents already reflect
              physical vacancy.{" "}
              <button
                className="text-button"
                onClick={() => update("mode", "manual")}
              >
                Switch to manual underwriting
              </button>
            </div>
          ) : (
            field("rent", "Monthly rent per unit", false, "$")
          )}
          {a.mode === "rentRoll" &&
            field(
              "occupiedMonthlyRent",
              "Occupied monthly contract rent",
              false,
              "$",
            )}
          {field("otherIncome", "Other monthly income", false, "$")}
          {a.mode === "manual" && field("vacancy", "Economic vacancy", true)}
          {field("creditLoss", "Credit loss", true)}
          {field("concessions", "Concessions", true)}
          {field("rentGrowth", "Annual rent growth", true)}
          {field("otherGrowth", "Other income growth", true)}
        </div>
      </details>
      <details>
        <summary>
          Operating expenses
          <ChevronDown size={15} />
        </summary>
        <div className="input-section">
          {expenseKeys.map((k) => (
            <NumberField
              key={k}
              label={expenseLabels[k]}
              value={a.expenses[k]}
              suffix="$ / yr"
              onChange={(v) =>
                set({ ...a, expenses: { ...a.expenses, [k]: v } })
              }
            />
          ))}
          <label className="field">
            <span>Management expense method</span>
            <select
              value={a.managementMode}
              onChange={(e) =>
                set({
                  ...a,
                  managementMode: e.target.value as "percent" | "fixed",
                  management: e.target.value === "percent" ? 0.05 : 15000,
                })
              }
            >
              <option value="percent">Percentage of EGI</option>
              <option value="fixed">Fixed annual dollars</option>
            </select>
          </label>
          {field(
            "management",
            "Property management",
            a.managementMode === "percent",
            a.managementMode === "fixed" ? "$ / yr" : "",
          )}
          {field("expenseGrowth", "Annual expense growth", true)}
          {field("taxesGrowth", "Property tax growth", true)}
          {field("insuranceGrowth", "Insurance growth", true)}
          {field("inflation", "Reserve and CapEx inflation", true)}
          {field("reserves", "Reserves per unit / year", false, "$")}
          {field("annualCapex", "Annual capital expenditures", false, "$")}
        </div>
      </details>
      <details>
        <summary>
          Financing
          <ChevronDown size={15} />
        </summary>
        <div className="input-section">
          <label className="field">
            <span>Loan sizing</span>
            <select
              value={a.loanMode}
              onChange={(e) =>
                update("loanMode", e.target.value as Assumptions["loanMode"])
              }
            >
              <option value="ltv">Loan-to-value</option>
              <option value="amount">Loan amount</option>
              <option value="constraints">
                Minimum of LTV, DSCR and debt yield
              </option>
            </select>
          </label>
          {a.loanMode !== "amount"
            ? field("ltv", "Loan-to-value", true)
            : field("loanAmount", "Loan amount", false, "$")}
          {field("rate", "Nominal annual interest", true)}
          {a.loanMode === "constraints" && (
            <>
              {field("minDscr", "Minimum DSCR", false, "x")}
              {field("minDebtYield", "Minimum debt yield", true)}
              <p>
                Binding constraint: {calculate(a).bindingConstraint ?? "N/A"}.
                Coverage uses amortizing payments, including during IO.
              </p>
            </>
          )}
          <label className="field">
            <span>Interest-only amortization</span>
            <select
              value={a.ioConvention ?? "after-io"}
              onChange={(e) =>
                update(
                  "ioConvention",
                  e.target.value as Assumptions["ioConvention"],
                )
              }
            >
              <option value="after-io">Full amortization after IO</option>
              <option value="consumes-term">IO consumes original term</option>
            </select>
          </label>
          <label className="field">
            <span>Interest accrual</span>
            <select
              value={a.accrual ?? "30/360"}
              onChange={(e) =>
                update("accrual", e.target.value as Assumptions["accrual"])
              }
            >
              <option>30/360</option>
              <option>actual/360</option>
            </select>
          </label>
          <label className="field">
            <span>Debt starting month</span>
            <input
              type="month"
              value={(a.startDate ?? "2026-10-01").slice(0, 7)}
              onChange={(e) => update("startDate", e.target.value + "-01")}
            />
          </label>
          {field("amortization", "Amortization term", false, "years")}
          {field("maturity", "Loan maturity", false, "years")}
          {field(
            "interestOnlyMonths",
            "Interest-only period",
            false,
            "months",
            "Uses the selected amortization convention after IO.",
          )}
          {field("loanFee", "Origination fee (% of loan)", true)}
        </div>
      </details>
      <details>
        <summary>
          Exit assumptions
          <ChevronDown size={15} />
        </summary>
        <div className="input-section">
          <label className="field">
            <span>Hold period</span>
            <select
              aria-label="Hold period"
              value={a.hold}
              onChange={(e) => update("hold", Number(e.target.value))}
            >
              {Array.from({ length: 8 }, (_, i) => (
                <option key={i} value={i + 3}>
                  {i + 3} years
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Exit cap method</span>
            <select
              value={a.exitCapMode ?? "manual"}
              onChange={(e) =>
                update(
                  "exitCapMode",
                  e.target.value as Assumptions["exitCapMode"],
                )
              }
            >
              <option value="spread">Going-in cap plus spread</option>
              <option value="manual">Entered exit cap</option>
            </select>
          </label>
          {a.exitCapMode === "spread" ? (
            <>
              {field("exitSpread", "Exit cap spread", true)}
              <p>
                Calculated exit cap:{" "}
                {calculate(a).effectiveExitCap === undefined
                  ? "N/A"
                  : `${(calculate(a).effectiveExitCap! * 100).toFixed(2)}%`}
              </p>
            </>
          ) : (
            field("exitCap", "Exit capitalization rate", true)
          )}
          {field("sellingCosts", "Exit selling costs", true)}
          {field("requiredReturn", "Target annual return", true)}
          <label className="field">
            <span>
              <input
                type="checkbox"
                checked={a.taxReassessment ?? false}
                onChange={(e) => update("taxReassessment", e.target.checked)}
              />{" "}
              Reassess property tax at sale
            </span>
          </label>
          {a.taxReassessment &&
            field("reassessmentRate", "Effective tax rate on sale value", true)}
          <small>
            Exit value uses next year's NOI. Sales occur at the end of the
            selected hold period.
          </small>
        </div>
      </details>
    </div>
  );
}
