import { useId, useState } from "react";
import type { Assumptions, Model } from "../finance/types";
import { refinanceCheck, sellVsHold } from "../finance/transactions";
import { money, pct, multiple } from "./format";

type Field = { label: string; unit?: string; help?: string };

// Entered values override defaults taken from the current analysis, so the
// defaults keep following the assumptions until the reader types a figure.
function useInputs(defaults: Record<string, string>) {
  const [typed, setTyped] = useState<Record<string, string>>({});
  const get = (key: string) => typed[key] ?? defaults[key];
  const num = (key: string) =>
    get(key).trim() === "" ? NaN : Number(get(key));
  const set = (key: string, value: string) =>
    setTyped((t) => ({ ...t, [key]: value }));
  return { get, num, set };
}
const tidy = (n: number) => String(Math.round(n * 10000) / 10000);

function Input({
  id,
  field,
  value,
  onChange,
}: {
  id: string;
  field: Field;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <span>
        {field.label}
        {field.unit ? ` (${field.unit})` : ""}
      </span>
      <input
        type="number"
        inputMode="decimal"
        step="any"
        value={value}
        aria-describedby={field.help ? `${id}-help` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.help && <small id={`${id}-help`}>{field.help}</small>}
    </label>
  );
}

function Rows({ rows }: { rows: [string, string, string?][] }) {
  return (
    <div className="table-scroll" tabIndex={0}>
      <table>
        <tbody>
          {rows.map(([label, value, note]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>
                <strong>{value}</strong>
              </td>
              <td>{note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RefinanceCheck({ a, m }: { a: Assumptions; m: Model }) {
  const id = useId();
  const f = useInputs({
    value: tidy(a.price),
    balance: tidy(m.loan),
    currentRate: tidy(a.rate * 100),
    yearsLeft: tidy(a.amortization),
    newRate: tidy(a.rate * 100),
    newYears: "30",
    maxLtv: tidy((a.ltv || 0.65) * 100),
    minDscr: tidy(a.minDscr ?? 1.25),
    closing: "1",
  });
  const fields: [string, Field][] = [
    ["value", { label: "Value today", unit: "$" }],
    ["balance", { label: "Current loan balance", unit: "$" }],
    ["currentRate", { label: "Current interest rate", unit: "%" }],
    [
      "yearsLeft",
      {
        label: "Years left on amortization",
        help: "Years over which today's payments would pay the loan to zero.",
      },
    ],
    ["newRate", { label: "New interest rate", unit: "%" }],
    ["newYears", { label: "New amortization", unit: "years" }],
    [
      "maxLtv",
      {
        label: "Maximum loan-to-value",
        unit: "%",
        help: "The lender's cap on the loan as a share of value.",
      },
    ],
    [
      "minDscr",
      {
        label: "Minimum DSCR",
        unit: "x",
        help: "NOI divided by yearly loan payments; lenders often want about 1.25x.",
      },
    ],
    ["closing", { label: "Closing costs", unit: "% of new loan" }],
  ];
  const r = refinanceCheck({
    value: f.num("value"),
    noi: m.years[0]?.noi ?? 0,
    balance: f.num("balance"),
    currentRate: f.num("currentRate") / 100,
    currentYearsLeft: f.num("yearsLeft"),
    newRate: f.num("newRate") / 100,
    newYears: f.num("newYears"),
    maxLtv: f.num("maxLtv") / 100,
    minDscr: f.num("minDscr"),
    closingPct: f.num("closing") / 100,
  });
  const ok = r.errors.length === 0;
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>What a new loan would do</h2>
          <p>
            How much a new loan could be, what it pays out at closing, and how
            long a lower payment takes to repay the costs. Uses this analysis'
            Year 1 NOI ({money(m.years[0]?.noi ?? 0)}). A modeled estimate, not
            a lender quote.
          </p>
        </div>
      </div>
      <div className="mapping-grid">
        {fields.map(([key, field]) => (
          <Input
            key={key}
            id={`${id}-${key}`}
            field={field}
            value={f.get(key)}
            onChange={(v) => f.set(key, v)}
          />
        ))}
      </div>
      {!ok && (
        <div className="alert error" role="alert">
          <ul>
            {r.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {ok && (
        <Rows
          rows={[
            ["Largest loan by value", money(r.maxByLtv), "Value × maximum LTV"],
            [
              "Largest loan by coverage",
              money(r.maxByDscr),
              "The payment that leaves NOI at the minimum DSCR",
            ],
            [
              "New loan",
              money(r.newLoan),
              `Limited by ${r.binding === "ltv" ? "loan-to-value" : "coverage (DSCR)"}`,
            ],
            ["Closing costs", money(r.closingCosts)],
            [
              r.cashOut >= 0
                ? "Cash out at closing"
                : "Cash you bring to closing",
              money(Math.abs(r.cashOut)),
              "New loan less payoff less closing costs",
            ],
            [
              "Monthly payment now → after",
              `${money(r.currentPayment, 2)} → ${money(r.newPayment, 2)}`,
              `${r.paymentChange <= 0 ? "Saves" : "Adds"} ${money(Math.abs(r.paymentChange), 2)} a month`,
            ],
            [
              "DSCR now → after",
              `${multiple(r.currentDscr)} → ${multiple(r.newDscr)}`,
            ],
            [
              "Months to repay closing costs",
              r.breakEvenMonths === null
                ? "No monthly saving"
                : `${r.breakEvenMonths.toFixed(1)} months`,
              "Closing costs divided by the monthly payment saved",
            ],
          ]}
        />
      )}
    </section>
  );
}

export function SellVsHold({ a, m }: { a: Assumptions; m: Model }) {
  const id = useId();
  const f = useInputs({
    value: tidy(a.price),
    balance: tidy(m.loan),
    selling: tidy(a.sellingCosts * 100),
    years: String(a.hold),
    target: tidy((a.requiredReturn ?? 0.1) * 100),
  });
  const fields: [string, Field][] = [
    ["value", { label: "What it would sell for today", unit: "$" }],
    ["balance", { label: "Loan you would pay off", unit: "$" }],
    ["selling", { label: "Selling costs", unit: "% of price" }],
    ["years", { label: "Years you would hold instead", unit: "3 to 10" }],
    [
      "target",
      {
        label: "Target return",
        unit: "%",
        help: "Later cash is discounted at this rate to compare it with cash today.",
      },
    ],
  ];
  const r = sellVsHold(a, {
    value: f.num("value"),
    balance: f.num("balance"),
    sellingCosts: f.num("selling") / 100,
    holdYears: f.num("years"),
    discountRate: f.num("target") / 100,
  });
  const ok = r.errors.length === 0;
  const verdict =
    r.advantage === null
      ? ""
      : r.advantage >= 0
        ? `Holding is worth ${money(r.advantage)} more than selling today at a ${pct(f.num("target") / 100)} target return.`
        : `Selling today is worth ${money(-r.advantage)} more than holding at a ${pct(f.num("target") / 100)} target return.`;
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>Cash today or cash over time</h2>
          <p>
            Compares cash in hand if you sell today with the cash this analysis
            expects if you keep the property, in today's dollars. Taxes are not
            modeled.
          </p>
        </div>
      </div>
      <div className="mapping-grid">
        {fields.map(([key, field]) => (
          <Input
            key={key}
            id={`${id}-${key}`}
            field={field}
            value={f.get(key)}
            onChange={(v) => f.set(key, v)}
          />
        ))}
      </div>
      {!ok && (
        <div className="alert error" role="alert">
          <ul>
            {r.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {ok && (
        <>
          <p className="import-explanation" role="status">
            {verdict}
          </p>
          <Rows
            rows={[
              [
                "Cash if you sell today",
                money(r.sellNowNet),
                "Price less selling costs less loan payoff",
              ],
              [
                "Value of holding today",
                money(r.holdPresentValue),
                "Hold-case cash flows, discounted at your target return",
              ],
              [
                "Holding minus selling",
                money(r.advantage),
                "Positive favors holding",
              ],
              [
                "Return on today's equity if you hold",
                pct(r.holdIrr),
                "What keeping your equity in the property earns",
              ],
              [
                "Cash back per $1 of equity",
                multiple(r.holdMultiple),
                "All hold-case cash divided by cash if sold today",
              ],
              [
                "Break-even exit cap",
                r.breakEvenExitCap !== null
                  ? pct(r.breakEvenExitCap)
                  : r.holdWinsAtAnyCap
                    ? "Holding wins up to 25%"
                    : "Selling wins at any cap tested",
                "Exit cap at which holding and selling are worth the same",
              ],
            ]}
          />
        </>
      )}
    </section>
  );
}
