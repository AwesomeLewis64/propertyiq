import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Paperclip,
  Play,
  ChartNoAxesColumnIncreasing,
  House,
  Calculator,
  X,
  ArrowLeft,
  Check,
  FileSpreadsheet,
} from "lucide-react";
import Brand from "./Brand";
import {
  extractBrief,
  sampleProject,
  setupProject,
  setupAnnual,
  type SetupValues,
  type WorkspaceLaunch,
} from "./startFlow";
import { money } from "./format";
import { sampleSummary } from "../finance/sharedSample";
import { calculate } from "../finance/model";
import type { Assumptions } from "../finance/types";
type Intent = "overview" | "monthly" | "price" | "financing";
const now = new Date();
const blank: SetupValues = {
  name: "",
  location: "",
  strategy: "acquisition",
  units: "",
  rent: "",
  price: "",
  expenses: "",
  loan: "",
  rate: "",
  start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  equity: "",
  exitCap: "",
  sellingCosts: "2.5",
  requiredReturn: "10",
  amortization: "30",
  maturity: "10",
  hold: "5",
};
export default function StartPage({
  onOpen,
  onAnnual,
}: {
  onOpen: (launch?: WorkspaceLaunch) => void;
  onAnnual: (a?: Assumptions) => void;
}) {
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState(false);
  const [values, setValues] = useState<SetupValues>(blank);
  const [recognized, setRecognized] = useState<string[]>([]);
  const [intent, setIntent] = useState<Intent>("overview");
  const [fileError, setFileError] = useState("");
  const [moneyDrafts, setMoneyDrafts] = useState<Record<string, string>>({});
  const summary = sampleSummary();
  const live = extractBrief(description);
  const start = (next: Intent = "overview") => {
    const numbers = extractBrief(description);
    setValues({
      ...blank,
      ...Object.fromEntries(
        Object.entries(numbers).map(([key, n]) => [key, String(n)]),
      ),
    });
    setMoneyDrafts({});
    setRecognized(Object.keys(numbers));
    setIntent(next);
    setReview(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const update = (key: keyof SetupValues, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));
  const field = (
    key: keyof SetupValues,
    label: string,
    opts: {
      type?: string;
      min?: number;
      max?: number;
      required?: boolean;
      placeholder?: string;
    } = {},
  ) => (
    <label className="iq-setup-field" key={key}>
      <span>
        {label}
        {recognized.includes(key) && (
          <small>
            <Check size={12} /> From description
          </small>
        )}
      </span>
      <input
        aria-label={label}
        type={
          ["price", "rent", "expenses", "loan", "equity"].includes(key)
            ? "text"
            : (opts.type ?? "number")
        }
        inputMode={
          ["price", "rent", "expenses", "loan", "equity"].includes(key)
            ? "decimal"
            : undefined
        }
        value={
          ["price", "rent", "expenses", "loan", "equity"].includes(key) &&
          moneyDrafts[key] === undefined &&
          values[key]
            ? new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 2,
              }).format(Number(values[key]))
            : (moneyDrafts[key] ?? values[key] ?? "")
        }
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() =>
          setMoneyDrafts((d) => {
            const next = { ...d };
            delete next[key];
            return next;
          })
        }
        onChange={(e) => {
          if (["price", "rent", "expenses", "loan", "equity"].includes(key))
            setMoneyDrafts((d) => ({ ...d, [key]: e.target.value }));
          update(
            key,
            ["price", "rent", "expenses", "loan", "equity"].includes(key)
              ? e.target.value.replace(/[$,\s]/g, "")
              : e.target.value,
          );
        }}
        min={opts.min}
        max={opts.max}
        step={key === "units" ? 1 : "any"}
        required={opts.required}
        placeholder={opts.placeholder}
      />
    </label>
  );
  return (
    <div className="iq-start">
      <a className="skip-link" href="#start-content">
        Skip to main content
      </a>
      <header className="iq-start-header">
        <button
          className="brand"
          aria-label="PropertyIQ home"
          onClick={() => setReview(false)}
        >
          <Brand />
        </button>
        <nav aria-label="Start page">
          <a href="#how-it-works" onClick={() => setReview(false)}>
            How it works
          </a>
          <button
            onClick={() => onOpen({ project: sampleProject(), tab: "report" })}
          >
            Sample report
          </button>
          <button className="iq-header-pill" onClick={() => onOpen()}>
            Monthly planner <ArrowUpRight size={14} />
          </button>
        </nav>
      </header>
      <main id="start-content">
        {review ? (
          <section className="iq-review">
            <button className="iq-text-link" onClick={() => setReview(false)}>
              <ArrowLeft size={16} /> Back to start
            </button>
            <span className="iq-eyebrow">YOUR STARTING POINT</span>
            <h1>
              Review your
              <br />
              property inputs.
            </h1>
            <p>Review the numbers we found, and fill in what you know.</p>
            <div className="iq-review-note">
              {recognized.length
                ? `${recognized.length} figures found using simple text matching.`
                : "No figures extracted. You can enter them below."}{" "}
              Every figure is editable. This step does not verify your
              assumptions.
            </div>
            <form
              className="iq-setup"
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  !file &&
                  intent === "overview" &&
                  values.strategy === "acquisition"
                ) {
                  const a = setupAnnual(values);
                  const errors = calculate(a).errors;
                  if (errors.length) {
                    setFileError(errors.join(" "));
                    return;
                  }
                  onAnnual(a);
                  return;
                }
                onOpen({
                  project: setupProject(values, description),
                  tab: file
                    ? "imports"
                    : intent === "price" || intent === "financing"
                      ? "decisionlab"
                      : intent,
                  file: file ?? undefined,
                  decision:
                    intent === "price"
                      ? "breakeven"
                      : intent === "financing"
                        ? "lenders"
                        : undefined,
                });
              }}
            >
              <div className="iq-setup-title">
                <span>01</span>
                <div>
                  <h2>Property basics</h2>
                  <p>A name and starting point for your analysis.</p>
                </div>
              </div>
              <div className="iq-setup-grid">
                {field("name", "Property name", {
                  type: "text",
                  required: true,
                  placeholder: "e.g. Riverside rental property",
                })}
                {field("location", "Location", {
                  type: "text",
                  placeholder: "City, state",
                })}
                <label className="iq-setup-field">
                  <span>What are you analyzing?</span>
                  <select
                    value={values.strategy}
                    onChange={(e) => update("strategy", e.target.value)}
                  >
                    <option value="acquisition">Rental acquisition</option>
                    <option value="existing">Existing rental property</option>
                    <option value="development-sale">
                      Development → unit sales
                    </option>
                    <option value="development-hold">
                      Development → rental hold
                    </option>
                  </select>
                </label>
                {field("units", "Number of units", {
                  required: true,
                  min: 1,
                  max: 500,
                })}
                {field("start", "Forecast starting month", {
                  type: "month",
                  required: true,
                })}
                {field(
                  "price",
                  values.strategy.startsWith("development")
                    ? "Land / acquisition cost ($)"
                    : "Purchase price ($)",
                  { min: 0 },
                )}
                {values.strategy === "existing" &&
                  field("equity", "As-of owner equity ($)", {
                    required: true,
                    min: 0,
                  })}
              </div>
              <div className="iq-setup-title">
                <span>02</span>
                <div>
                  <h2>Income and financing</h2>
                  <p>Property totals. Unit details and loan terms come next.</p>
                </div>
              </div>
              <div className="iq-setup-grid">
                {field("rent", "Total monthly rent ($)", { min: 0 })}
                {field("expenses", "Annual operating expenses ($)", { min: 0 })}
                {field("loan", "Opening loan balance / amount ($)", { min: 0 })}
                {field("rate", "Annual interest rate (%)", {
                  required: Number(values.loan) > 0,
                  min: 0,
                  max: 100,
                })}
              </div>
              {file && (
                <div className="iq-selected-file">
                  <FileSpreadsheet size={18} />
                  <span>{file.name} · ready for column mapping</span>
                </div>
              )}
              <section className="iq-defaults-panel">
                <h2>Assumptions we filled in</h2>
                <p>
                  Editable defaults · not verified against your deal. Unentered
                  dollar amounts start at $0. Vacancy, collection loss,
                  management, closing costs and CapEx start at zero; review them
                  before relying on returns.
                </p>
                <div className="iq-setup-grid">
                  {field(
                    "exitCap",
                    "Exit cap (%) · blank = going-in cap + 0.625%",
                    { min: 0.001, max: 100 },
                  )}
                  {field("sellingCosts", "Selling costs (%) · default 2.5%", {
                    min: 0,
                    max: 100,
                  })}
                  {field("requiredReturn", "Target return (%) · default 10%", {
                    min: 0,
                    max: 100,
                  })}
                  {field("amortization", "Amortization years · default 30", {
                    min: 1,
                    max: 50,
                  })}
                  {field("maturity", "Maturity years · default 10", {
                    min: 1,
                    max: 50,
                  })}
                  {field("hold", "Hold years · default 5", { min: 3, max: 10 })}
                </div>
                <p>
                  Full amortization starts after IO; interest accrues at 30/360.
                  No real-time market or tax data is used. Development delivery
                  dates need entry in the monthly planner.
                </p>
              </section>
              {fileError && <p role="alert">{fileError}</p>}
              <div className="iq-setup-footer">
                <span>Saved on this browser. No account needed.</span>
                <button className="button primary" type="submit">
                  {file ? "Continue to file mapping" : "Create analysis"}
                  <ArrowRight size={17} />
                </button>
              </div>
            </form>
          </section>
        ) : (
          <>
            <section className="iq-hero">
              <span className="iq-eyebrow">PROPERTY ANALYSIS, SIMPLIFIED</span>
              <h1>
                Analyze cash flow
                <br />
                and financing.
              </h1>
              <p className="iq-hero-subtitle">
                Enter your assumptions or import a spreadsheet. Review income,
                expenses, debt, and projected returns.
              </p>
              <form
                className="iq-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  start();
                }}
              >
                <label className="sr-only" htmlFor="property-brief">
                  Paste deal details
                </label>
                <textarea
                  id="property-brief"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Paste deal details"
                  rows={3}
                />
                {!description && (
                  <span className="iq-composer-example">
                    Simple text matching · review every extracted figure.
                  </span>
                )}
                {file && (
                  <div className="iq-selected-file">
                    <FileSpreadsheet size={17} />
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      aria-label="Remove selected file"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
                <div className="iq-composer-actions">
                  <label className="button iq-upload">
                    <Paperclip size={21} />
                    Upload files
                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      aria-label="Upload property spreadsheet"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        setFileError("");
                        if (!f) return;
                        if (
                          !/\.(csv|xlsx)$/i.test(f.name) ||
                          f.size > 5 * 1024 * 1024
                        ) {
                          setFile(null);
                          setFileError("Choose a CSV or XLSX file up to 5 MB.");
                          return;
                        }
                        setFile(f);
                      }}
                    />
                  </label>
                  <span>Rent rolls · Operating statements · CSV / XLSX</span>
                  <button className="button primary iq-analyze" type="submit">
                    Analyze property <ArrowRight size={20} />
                  </button>
                </div>
                {fileError && (
                  <p role="alert" className="iq-file-error">
                    {fileError}
                  </p>
                )}
              </form>
              <p className="composer-formats">
                Try: “$2.8M purchase; 20 units at $1,900/mo; 6.25% rate; 65%
                LTV.”
                <br />
                Or: “24 units for $3.1 million; rents are $1,100; annual
                expenses $120k.”
              </p>
              <div className="brief-preview" aria-live="polite">
                {Object.entries(live).map(([key, n]) => (
                  <span key={key}>
                    {key}: {n?.toLocaleString("en-US")}
                  </span>
                ))}
              </div>
              <div className="mode-cards">
                <button className="button primary" onClick={() => onAnnual()}>
                  Quick analysis · annual underwriting, debt and sensitivity
                </button>
                <button className="button" onClick={() => onOpen()}>
                  Monthly planner · leasing, development and cash timing
                </button>
              </div>
              <div className="iq-secondary-actions">
                <button onClick={() => onAnnual()}>
                  <Play size={17} className="iq-play" />
                  Try with sample property
                </button>
                <i />
                <button
                  onClick={() => {
                    setDescription("");
                    setValues(blank);
                    setRecognized([]);
                    setIntent("overview");
                    setReview(true);
                  }}
                >
                  Enter numbers manually
                </button>
              </div>
              <p className="iq-no-account">
                No sign-up to explore. Your files stay in this browser.
              </p>
              <div className="iq-question-actions">
                <button onClick={() => start("monthly")}>
                  <ChartNoAxesColumnIncreasing size={22} />
                  Review cash flow
                </button>
                <button onClick={() => start("price")}>
                  <House size={22} />
                  Check an asking price
                </button>
                <button onClick={() => start("financing")}>
                  <Calculator size={22} />
                  Compare financing
                </button>
              </div>
            </section>
            <section className="iq-look-inside" id="sample-report">
              <div>
                <span className="iq-eyebrow">A LOOK INSIDE</span>
                <h2>
                  Review income,
                  <br />
                  costs, and returns.
                </h2>
                <p>
                  Income, expenses, and assumptions
                  <br className="iq-desktop-break" /> in one readable report.
                </p>
              </div>
              <article className="iq-sample-card">
                <div className="iq-sample-heading">
                  <div>
                    <h3>{summary.name}</h3>
                    <p>
                      {summary.units}-unit multifamily · Fictional value-add
                      case
                    </p>
                  </div>
                  <button
                    className="iq-text-link"
                    onClick={() =>
                      onOpen({ project: sampleProject(), tab: "report" })
                    }
                  >
                    View sample report <ArrowUpRight size={15} />
                  </button>
                </div>
                <div className="iq-sample-metrics">
                  {[
                    ["Annual potential rent", summary.rent],
                    ["Operating expenses", summary.expenses],
                    ["Net operating income", summary.noi],
                  ].map(([label, n]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{money(n as number)}</strong>
                    </div>
                  ))}
                </div>
                <div
                  className="iq-income-bar"
                  role="img"
                  aria-label={`Illustrative NOI ${money(summary.noi)}; operating expenses ${money(summary.expenses)}`}
                >
                  <span />
                  <span />
                </div>
                <div className="iq-bar-legend">
                  <span>
                    <i />
                    Net operating income &nbsp; {money(summary.noi)}
                  </span>
                  <span>
                    <i />
                    Operating expenses &nbsp; {money(summary.expenses)}
                  </span>
                </div>
                <small>
                  Before financing and capital expenditures. Based on
                  illustrative inputs.
                </small>
              </article>
            </section>
            <section className="iq-how" id="how-it-works">
              <div className="iq-section-heading">
                <span className="iq-eyebrow">
                  A CLEAR PATH THROUGH THE NUMBERS
                </span>
                <h2>Three steps to a property analysis.</h2>
              </div>
              <div className="iq-how-grid">
                {[
                  [
                    "01",
                    "Enter property inputs",
                    "Enter a few figures, describe a property, or map a spreadsheet. Review every input before it enters your analysis.",
                  ],
                  [
                    "02",
                    "Review cash flow",
                    "Follow monthly cash, loan payments and your forecast period. Compare scenarios and see when more cash is needed.",
                  ],
                  [
                    "03",
                    "Check the assumptions",
                    "Trace calculations, connect source documents and compare against your workbook. Build a report you can explain.",
                  ],
                ].map(([number, title, body]) => (
                  <article key={number}>
                    <span>{number}</span>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </article>
                ))}
              </div>
            </section>
            <section className="iq-return">
              <div>
                <h2>Already have a project?</h2>
                <p>Pick up where you left off in your local workspace.</p>
              </div>
              <button className="button" onClick={() => onOpen()}>
                Open saved workspace
                <ArrowRight size={17} />
              </button>
            </section>
          </>
        )}
      </main>
      <div className="iq-footer">
        <span>
          <Brand />
        </span>
        <p>Local analysis. Transparent assumptions.</p>
        <button onClick={() => onAnnual()}>
          Quick analysis <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
}
