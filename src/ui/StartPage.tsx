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
  type SetupValues,
  type WorkspaceLaunch,
} from "./startFlow";
import { money } from "./format";
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
};
export default function StartPage({
  onOpen,
  onAnnual,
}: {
  onOpen: (launch?: WorkspaceLaunch) => void;
  onAnnual: () => void;
}) {
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState(false);
  const [values, setValues] = useState<SetupValues>(blank);
  const [recognized, setRecognized] = useState<string[]>([]);
  const [intent, setIntent] = useState<Intent>("overview");
  const [fileError, setFileError] = useState("");
  const start = (next: Intent = "overview") => {
    const numbers = extractBrief(description);
    setValues({
      ...blank,
      ...Object.fromEntries(
        Object.entries(numbers).map(([key, n]) => [key, String(n)]),
      ),
    });
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
        type={opts.type ?? "number"}
        value={values[key]}
        onChange={(e) => update(key, e.target.value)}
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
            Open workspace <ArrowUpRight size={14} />
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
              A few details.
              <br />
              Then the bigger picture.
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
                  placeholder: "e.g. Walnut rental property",
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
              <p className="iq-setup-disclosure">
                This creates a starting model, not completed underwriting. Empty
                amounts start at zero. A loan starts with 30-year amortization
                and five-year maturity. Default rental exit cap: 6.5%; selling
                costs: 2.5%; required return: 10%. Review these, closing costs,
                reserves, vacancy and capital plans in the workspace.
                Development units remain unavailable until you enter delivery
                dates.
              </p>
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
                Your next property.
                <br />A clearer picture.
              </h1>
              <p className="iq-hero-subtitle">
                Start with a question, a spreadsheet, or the numbers you have.
              </p>
              <form
                className="iq-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  start();
                }}
              >
                <label className="sr-only" htmlFor="property-brief">
                  Describe a property or what you want to analyze
                </label>
                <textarea
                  id="property-brief"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe a property or ask what you want to analyze"
                  rows={3}
                />
                {!description && (
                  <span className="iq-composer-example">
                    e.g. Evaluate an 8-unit rental with $9,600 in monthly rent
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
              <div className="iq-secondary-actions">
                <button onClick={() => onOpen({ project: sampleProject() })}>
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
                  From property details
                  <br />
                  to the bigger picture.
                </h2>
                <p>
                  Income, expenses, and assumptions
                  <br className="iq-desktop-break" /> in one readable report.
                </p>
              </div>
              <article className="iq-sample-card">
                <div className="iq-sample-heading">
                  <div>
                    <h3>Maple Court</h3>
                    <p>8-unit multifamily · Illustrative sample</p>
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
                    ["Annual rental income", 115200],
                    ["Operating expenses", 42000],
                    ["Net operating income", 73200],
                  ].map(([label, n]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{money(n as number)}</strong>
                    </div>
                  ))}
                </div>
                <div
                  className="iq-income-bar"
                  aria-label="Illustrative income: $73,200 net operating income and $42,000 expenses"
                >
                  <span />
                  <span />
                </div>
                <div className="iq-bar-legend">
                  <span>
                    <i />
                    Net operating income &nbsp; $73,200
                  </span>
                  <span>
                    <i />
                    Operating expenses &nbsp; $42,000
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
                <h2>Start simply. Go deeper when you need to.</h2>
              </div>
              <div className="iq-how-grid">
                {[
                  [
                    "01",
                    "Bring what you have",
                    "Enter a few figures, describe a property, or map a spreadsheet. Review every input before it enters your analysis.",
                  ],
                  [
                    "02",
                    "See the full picture",
                    "Follow monthly cash, loan payments and a five-year hold. Compare scenarios and see when more cash is needed.",
                  ],
                  [
                    "03",
                    "Make assumptions visible",
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
        <button onClick={onAnnual}>
          Open annual model <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
}
