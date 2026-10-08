import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  Plus,
  Copy,
  Search,
  LayoutDashboard,
  FileText,
  Building2,
  Landmark,
  CalendarDays,
  FolderOpen,
  SlidersHorizontal,
  ShieldCheck,
  Home,
} from "lucide-react";
import Brand from "../ui/Brand";
import {
  Card,
  NumberField,
  TextField,
  Toggle,
  Select,
  Metric,
  Plot,
} from "./Controls";
import { newProject, uid } from "./defaults";
import { forecast } from "./engine";
import type { Project, Forecast } from "./types";
import type { MetricKey } from "./toolSchema";
import {
  ADVANCED_KEY,
  persistWorkspace,
  readWorkspace,
  type Workspace,
} from "./store";
import { money, pct, multiple } from "../ui/format";
import { csvText, download } from "../data/export";
import "./advanced.css";
const UnitEditor = lazy(() => import("./UnitEditor")),
  FinanceEditor = lazy(() => import("./FinanceEditor")),
  ImportPanel = lazy(() => import("./ImportPanel")),
  ReturnsPanel = lazy(() => import("./ReturnsPanel")),
  RiskPanel = lazy(() => import("./RiskPanel")),
  DiligencePanel = lazy(() => import("./DiligencePanel")),
  ActualsPanel = lazy(() => import("./ActualsPanel")),
  PortfolioPanel = lazy(() => import("./PortfolioPanel"));
const DecisionLab = lazy(() => import("./DecisionLab")),
  PropertyReport = lazy(() => import("./PropertyReport")),
  ReconciliationPanel = lazy(() => import("./ReconciliationPanel")),
  CalendarPanel = lazy(() => import("./CalendarPanel")),
  OperatingDetailPanel = lazy(() => import("./OperatingDetailPanel")),
  SourcesPanel = lazy(() => import("./SourcesPanel")),
  DecisionsPanel = lazy(() => import("./DecisionsPanel"));
const Expenses = lazy(() =>
    import("./BudgetEditor").then((v) => ({ default: v.Expenses })),
  ),
  Development = lazy(() =>
    import("./BudgetEditor").then((v) => ({ default: v.Development })),
  );
const tabs = [
  ["overview", "Property overview"],
  ["report", "Property report"],
  ["decisionlab", "Decision Lab"],
  ["reconciliation", "Workbook reconciliation"],
  ["calendar", "Leasing & project calendar"],
  ["units", "Units & leasing"],
  ["monthly", "Monthly cash & funding"],
  ["finance", "Debt & borrowing capacity"],
  ["development", "Development & budgets"],
  ["expenses", "Expense schedules"],
  ["imports", "Workbook imports"],
  ["actuals", "Actuals & variance"],
  ["detail", "Detailed operating records"],
  ["returns", "Investors & tax scenario"],
  ["risk", "Stress & probabilities"],
  ["diligence", "Evidence & diligence"],
  ["sources", "Assumptions & sources"],
  ["decisions", "Decisions & case study"],
  ["portfolio", "Portfolio & backups"],
] as const;
type Tab = (typeof tabs)[number][0];
const navGroups: { label: string; icon: typeof Home; ids: Tab[] }[] = [
  {
    label: "The big picture",
    icon: LayoutDashboard,
    ids: ["overview", "report"],
  },
  {
    label: "Property & plans",
    icon: Building2,
    ids: ["units", "expenses", "development", "calendar"],
  },
  {
    label: "Cash & decisions",
    icon: Landmark,
    ids: ["monthly", "finance", "decisionlab", "risk", "returns"],
  },
  {
    label: "Files & performance",
    icon: FolderOpen,
    ids: ["imports", "reconciliation", "actuals", "detail"],
  },
  {
    label: "Evidence & review",
    icon: ShieldCheck,
    ids: ["diligence", "sources", "decisions"],
  },
  { label: "Your workspace", icon: FolderOpen, ids: ["portfolio"] },
];
function initial() {
  try {
    const w = readWorkspace();
    return {
      workspace: w.projects.length ? w : { ...w, projects: [newProject()] },
      error: "",
      locked: false,
    };
  } catch (e) {
    return {
      workspace: {
        version: 2 as const,
        projects: [newProject()],
        revisions: [],
      },
      error: e instanceof Error ? e.message : "Unable to load local data.",
      locked: true,
    };
  }
}
function monthlyCsv(m: Forecast) {
  return csvText([
    [
      "Month",
      "Date",
      "Occupied",
      "Rent",
      "Vacancy opportunity",
      "Concessions",
      "Credit loss",
      "Other",
      "Expenses",
      "NOI",
      "Lender NCF",
      "CapEx",
      "Reserves",
      "Regular debt",
      "Interest",
      "Loan balance",
      "Draws",
      "Refinance proceeds",
      "Payoffs",
      "Fees",
      "Net disposition receipts before payoffs",
      "Cash before owner funding",
      "Capital call",
      "Distribution",
      "Ending cash",
      "Equity cash flow",
      "Estimated tax",
      "After-tax equity flow",
      "Actual",
    ],
    ...m.rows.map((r) => [
      r.month,
      r.date,
      r.occupied,
      r.rent,
      r.vacancy,
      r.concessions,
      r.creditLoss,
      r.other,
      r.expenses,
      r.noi,
      r.lenderNcf,
      r.capex,
      r.reserves,
      r.debtService,
      r.interest,
      r.balance,
      r.draws,
      r.refinance,
      r.payoffs,
      r.fees,
      r.netSale,
      r.cashBefore,
      r.capitalCall,
      r.distribution,
      r.cash,
      r.equityFlow,
      r.tax,
      r.afterTaxFlow,
      r.actual ? "Yes" : "No",
    ]),
  ]);
}
export default function AdvancedWorkspace({
  onBack,
  onHome,
  initialProject,
  initialTab,
  initialFile,
  initialDecision,
}: {
  onBack: () => void;
  onHome: () => void;
  initialProject?: Project;
  initialTab?: Tab;
  initialFile?: File;
  initialDecision?: string;
}) {
  const [loaded] = useState(() => {
      const loaded = initial();
      if (
        initialProject &&
        !loaded.locked &&
        loaded.workspace.projects.length < 100
      )
        loaded.workspace = {
          ...loaded.workspace,
          projects: [...loaded.workspace.projects, initialProject],
        };
      return loaded;
    }),
    [workspace, setWorkspace] = useState<Workspace>(loaded.workspace),
    [selected, setSelected] = useState(
      loaded.workspace.projects.find((p) => p.id === initialProject?.id)?.id ??
        loaded.workspace.projects[0].id,
    ),
    [tab, setTab] = useState<Tab>(initialTab ?? "overview"),
    [toolSearch, setToolSearch] = useState(""),
    [traceMetric, setTraceMetric] = useState<MetricKey>("noi"),
    [saveError, setSaveError] = useState(loaded.error),
    [saveTime, setSaveTime] = useState(""),
    [newStrategy, setNewStrategy] =
      useState<Project["strategy"]>("acquisition");
  const p =
    workspace.projects.find((p) => p.id === selected) ?? workspace.projects[0];
  const m = useMemo(() => forecast(p), [p]);
  const setProject = (next: Project) =>
    setWorkspace((w) => ({
      ...w,
      projects: w.projects.map((x) => (x.id === p.id ? next : x)),
    }));
  const leaveWorkspace = (go: () => void) => {
    if (
      loaded.locked ||
      workspace.projects.some((p) => forecast(p).errors.length)
    ) {
      setSaveError(
        "This draft cannot be saved yet. Correct invalid inputs or export a backup before leaving.",
      );
      return;
    }
    try {
      persistWorkspace(workspace);
      go();
    } catch {
      setSaveError(
        "Unable to save this browser's project data. Export a backup before leaving.",
      );
    }
  };
  useEffect(() => {
    document.title = `PropertyIQ | ${tabs.find((t) => t[0] === tab)?.[1] ?? "Monthly workspace"}`;
  }, [tab]);
  useEffect(() => {
    if (loaded.locked) return;
    const timeout = setTimeout(() => {
      try {
        if (workspace.projects.some((p) => forecast(p).errors.length)) return;
        persistWorkspace(workspace);
        setSaveTime(new Date().toLocaleTimeString());
        setSaveError("");
      } catch (e) {
        setSaveError(
          e instanceof Error
            ? e.message
            : "Local save failed. Export a backup.",
        );
      }
    }, 650);
    return () => clearTimeout(timeout);
  }, [workspace, loaded.locked]);
  const create = () => {
    if (workspace.projects.length >= 100) return;
    const n = newProject(newStrategy);
    setWorkspace((w) => ({ ...w, projects: [...w.projects, n] }));
    setSelected(n.id);
    setTab("overview");
  };
  const createCopy = (q: Project) => {
    if (workspace.projects.length >= 100) return;
    const n = { ...structuredClone(q), id: uid() };
    setWorkspace((w) => ({ ...w, projects: [...w.projects, n] }));
    setSelected(n.id);
    setTab("overview");
  };
  const trace = (key: MetricKey) => {
    setTraceMetric(key);
    setTab("sources");
  };
  const exportDebt = () =>
    download(
      "propertyiq-monthly-loans.csv",
      csvText([
        [
          "Month",
          "Loan",
          "Opening",
          "Draw",
          "Rate",
          "Interest",
          "Capitalized interest",
          "Regular service",
          "Principal",
          "Payoff",
          "Fees",
          "Ending",
          "Refinance",
        ],
        ...m.debt.map((r) => [
          r.month,
          r.loan,
          r.opening,
          r.draw,
          r.rate,
          r.interest,
          r.capitalized,
          r.service,
          r.principal,
          r.payoff,
          r.fee,
          r.balance,
          r.refinance,
        ]),
      ]),
    );
  const exportMemo = () => {
    const text = `# ${p.name}\n\nEXPERIMENTAL / UNVERIFIED MODEL\n\nStrategy: ${p.strategy}\nForecast start: ${p.startDate}; ${p.months} months\nInitial/as-of equity: ${money(m.initialEquity)}\nForecast XIRR: ${pct(m.irr)}\nNPV at ${pct(p.discount)}: ${money(m.npv)}\nEquity multiple: ${multiple(m.multiple)}\nAdditional owner funding: ${money(m.additionalEquity)}\nDebt capacity: ${money(m.sizing.maximum)} (${m.sizing.binding})\n\n## Modeling assumptions\n\nUnit schedules, expenses and financing are user-entered. Cash shortfalls are funded by disclosed owner contributions. Dated returns use a 365-day year. Taxes are illustrative entered-rate scenarios.\n\n## Warnings\n\n${m.warnings.map((w) => `- ${w}`).join("\n")}\n\n## Diligence\n\n${p.tasks.map((t) => `- [${t.status === "complete" ? "x" : " "}] ${t.title} — ${t.owner || "unassigned"}; due ${t.due || "unspecified"}; ${t.note}`).join("\n")}\n\n## Evidence\n\n${p.evidence.map((e) => `- ${e.title}: ${e.status}; ${e.date}; ${e.source}; ${e.note}`).join("\n")}`;
    download("propertyiq-investment-notes.md", text, "text/markdown");
  };
  return (
    <div className="advanced">
      <a className="skip-link" href="#advanced-main">
        Skip to main content
      </a>
      <header className="topbar">
        <button
          className="brand"
          onClick={() => leaveWorkspace(onHome)}
          aria-label="PropertyIQ home"
        >
          <Brand />
        </button>
        <span className="adv-header-label">YOUR PROPERTY WORKSPACE</span>
        <div className="iq-workspace-header-actions">
          <button
            className="iq-text-link"
            onClick={() => leaveWorkspace(onHome)}
          >
            <Home size={15} />
            Start page
          </button>
          <button
            className="button small"
            onClick={() => leaveWorkspace(onBack)}
          >
            <ArrowLeft size={15} />
            Annual workspace
          </button>
        </div>
      </header>
      <div className="adv-shell">
        <aside className="adv-sidebar">
          <label className="iq-tool-search">
            <Search size={15} />
            <input
              value={toolSearch}
              onChange={(e) => setToolSearch(e.target.value)}
              placeholder="Find a tool"
              aria-label="Find a workspace tool"
            />
          </label>
          <nav aria-label="Property analysis tools">
            {navGroups.map((group) => {
              const visible = tabs.filter(
                ([id, label]) =>
                  group.ids.includes(id) &&
                  label.toLowerCase().includes(toolSearch.toLowerCase()),
              );
              if (!visible.length) return null;
              return (
                <div className="iq-nav-group" key={group.label}>
                  <span className="iq-nav-group-label">
                    <group.icon size={13} />
                    {group.label}
                  </span>
                  {visible.map(([id, label]) => (
                    <button
                      key={id}
                      className={tab === id ? "active" : ""}
                      aria-current={tab === id ? "page" : undefined}
                      onClick={() => setTab(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              );
            })}
            {toolSearch &&
              !tabs.some(([, label]) =>
                label.toLowerCase().includes(toolSearch.toLowerCase()),
              ) && <p className="iq-no-tools">No matching tools.</p>}
          </nav>
          <p>
            Your work stays here.
            <br />
            Saved in this browser.
            <br />
            Export a backup to keep a copy.
          </p>
        </aside>
        <main id="advanced-main" className="adv-main">
          <div className="adv-heading">
            <div>
              <span className="eyebrow">
                {tabs.find((t) => t[0] === tab)?.[1]}
              </span>
              <h1>{p.name}</h1>
              <p>
                {p.location || "Location not supplied"} · {p.units.length} units
                · {p.months}-month forecast
              </p>
            </div>
            <div className="adv-actions">
              <button
                className="button primary small"
                onClick={() => setTab("report")}
              >
                <FileText size={15} />
                View report
              </button>
              <details className="iq-export-menu">
                <summary className="button small">
                  <Download size={14} />
                  Export
                </summary>
                <div>
                  <button
                    className="button small"
                    disabled={!!m.errors.length}
                    onClick={() =>
                      download("propertyiq-monthly-cash.csv", monthlyCsv(m))
                    }
                  >
                    <Download size={14} />
                    Monthly CSV
                  </button>
                  <button
                    className="button small"
                    disabled={!!m.errors.length}
                    onClick={exportDebt}
                  >
                    Debt CSV
                  </button>
                  <button
                    className="button small"
                    disabled={!!m.errors.length}
                    onClick={exportMemo}
                  >
                    Investment notes
                  </button>
                </div>
              </details>
            </div>
          </div>
          <details className="iq-model-status">
            <summary>
              <ShieldCheck size={15} />
              Model status: source reconciliation required
            </summary>
            <p>
              The monthly model is experimental. Review outputs against source
              documents before use. Fictional examples are not Walnut's results.
            </p>
          </details>
          <div className="adv-project-bar">
            <Select
              label="Active local project"
              value={p.id}
              onChange={setSelected}
              options={workspace.projects.map((p) => [p.id, p.name])}
            />
            <Select
              label="Example strategy"
              value={newStrategy}
              onChange={(v) => setNewStrategy(v as Project["strategy"])}
              options={[
                ["acquisition", "Rental acquisition"],
                ["existing", "Existing rental property"],
                ["development-sale", "Development → unit sales"],
                ["development-hold", "Development → rental hold"],
              ]}
            />
            <button
              className="button small"
              disabled={workspace.projects.length >= 100}
              onClick={create}
            >
              <Plus size={14} />
              Create example
            </button>
            <button
              className="button small"
              onClick={() => leaveWorkspace(onHome)}
            >
              <Plus size={14} />
              Add your property
            </button>
            <button
              className="button small"
              disabled={workspace.projects.length >= 100 || !!m.errors.length}
              onClick={() => {
                const n = {
                  ...structuredClone(p),
                  id: uid(),
                  name: `${p.name} (copy)`,
                };
                setWorkspace((w) => ({ ...w, projects: [...w.projects, n] }));
                setSelected(n.id);
              }}
            >
              <Copy size={14} />
              Duplicate
            </button>
            <small>
              {m.errors.length
                ? "Autosave paused: invalid draft"
                : saveTime
                  ? `Browser saved ${saveTime}`
                  : "Saving locally…"}
            </small>
          </div>
          {saveError && (
            <div className="alert error">
              <p>
                {saveError} Existing stored data has not been replaced. Use file
                backups to preserve this session.
              </p>
              {loaded.locked && (
                <button
                  className="button small"
                  onClick={() =>
                    download(
                      "propertyiq-unreadable-local-data.json",
                      localStorage.getItem(ADVANCED_KEY) ?? "",
                      "application/json",
                    )
                  }
                >
                  Download original local data
                </button>
              )}
            </div>
          )}
          {m.errors.length > 0 && (
            <div className="alert error" role="alert">
              <strong>Correct these assumptions to calculate results</strong>
              <ul>
                {m.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <Suspense
            key={p.id}
            fallback={<p role="status">Opening workspace tools…</p>}
          >
            {tab === "overview" ? (
              <Overview p={p} set={setProject} m={m} onTrace={trace} />
            ) : tab === "report" ? (
              <PropertyReport p={p} m={m} />
            ) : tab === "decisionlab" ? (
              <DecisionLab
                p={p}
                set={setProject}
                create={createCopy}
                initialSection={initialDecision}
              />
            ) : tab === "reconciliation" ? (
              <ReconciliationPanel p={p} set={setProject} />
            ) : tab === "calendar" ? (
              <CalendarPanel p={p} set={setProject} />
            ) : tab === "detail" ? (
              <OperatingDetailPanel p={p} set={setProject} />
            ) : tab === "sources" ? (
              <SourcesPanel
                key={`${p.id}-${traceMetric}`}
                p={p}
                set={setProject}
                initialMetric={traceMetric}
              />
            ) : tab === "decisions" ? (
              <DecisionsPanel p={p} set={setProject} />
            ) : tab === "units" ? (
              <UnitEditor p={p} set={setProject} />
            ) : tab === "monthly" ? (
              <MonthlyTable p={p} m={m} />
            ) : tab === "finance" ? (
              <FinanceEditor p={p} set={setProject} m={m} />
            ) : tab === "development" ? (
              <Development p={p} set={setProject} />
            ) : tab === "expenses" ? (
              <Expenses p={p} set={setProject} />
            ) : tab === "imports" ? (
              <ImportPanel p={p} set={setProject} initialFile={initialFile} />
            ) : tab === "actuals" ? (
              <ActualsPanel p={p} set={setProject} />
            ) : tab === "returns" ? (
              <ReturnsPanel p={p} set={setProject} m={m} />
            ) : tab === "risk" ? (
              <RiskPanel p={p} set={setProject} />
            ) : tab === "diligence" ? (
              <DiligencePanel p={p} set={setProject} />
            ) : (
              <PortfolioPanel
                workspace={workspace}
                current={p}
                onWorkspace={setWorkspace}
                onSelect={setSelected}
              />
            )}
          </Suspense>
          <details className="adv-details">
            <summary>Model conventions and remaining limits</summary>
            {m.warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
            <p>
              Month 1 begins at the forecast start; acquisition funds are at
              time zero; monthly cash flows occur at month-end. Construction
              cost lines spend evenly across their durations. Floating rates use
              entered all-in resets and a rate ceiling. Refis and maturities
              follow regular debt payments. Exit valuation uses the next 12
              forecast months of NOI. Owner calls fill cash shortfalls;
              distributions follow the cash-retention policy.
            </p>
            <p>
              External research, legal diligence and lender approval require
              human review. Shared online accounts are deferred. Tax and
              waterfall calculations are configurable simplified scenarios. This
              expansion has targeted regression coverage; it has not been
              reconciled against Walnut's original workbooks.
            </p>
            <p>
              <a
                href="https://support.microsoft.com/en-us/excel/functions/xirr-function"
                target="_blank"
                rel="noopener noreferrer"
              >
                Dated return reference
              </a>{" "}
              ·{" "}
              <a
                href="https://mfguide.fanniemae.com/node/1541"
                target="_blank"
                rel="noopener noreferrer"
              >
                Underwritten DSCR reference
              </a>
            </p>
          </details>
        </main>
      </div>
    </div>
  );
}
function Overview({
  p,
  set,
  m,
  onTrace,
}: {
  p: Project;
  set: (p: Project) => void;
  m: Forecast;
  onTrace: (key: MetricKey) => void;
}) {
  const n = (
    key:
      | "price"
      | "closing"
      | "initialCapex"
      | "openingCash"
      | "minimumCash"
      | "asOfEquity"
      | "months"
      | "rentGrowth"
      | "creditLoss"
      | "otherMonthly"
      | "management"
      | "reservesMonthly"
      | "exitCap"
      | "sellingCost",
    label: string,
    percent = false,
  ) => (
    <NumberField
      key={key}
      label={label}
      value={p[key]}
      percent={percent}
      onChange={(v) =>
        set({
          ...p,
          [key]: v,
          ...(key === "months"
            ? {
                lender: {
                  ...p.lender,
                  periodStart: Math.max(
                    1,
                    Math.min(p.lender.periodStart, v - 11),
                  ),
                },
              }
            : {}),
        })
      }
    />
  );
  return (
    <>
      <div className="metrics adv-metrics">
        <Metric
          label="Initial / as-of equity"
          onInspect={() => onTrace("equity")}
          value={m.errors.length ? "N/A" : money(m.initialEquity)}
        />
        <Metric
          label="Forecast XIRR"
          onInspect={() => onTrace("irr")}
          value={pct(m.irr)}
          note={m.irrReason ?? "Dated owner cash flows"}
        />
        <Metric
          label="NPV"
          onInspect={() => onTrace("npv")}
          value={money(m.npv)}
          note={`At ${pct(p.discount)} required return`}
        />
        <Metric
          label="Additional equity calls"
          onInspect={() => onTrace("funding")}
          value={m.errors.length ? "N/A" : money(m.additionalEquity)}
        />
      </div>
      <details className="adv-details iq-property-settings">
        <summary>
          <SlidersHorizontal size={16} />
          Property details & model settings{" "}
          <span>Review or edit assumptions</span>
        </summary>
        <Card title="Project and cash policy">
          <div className="adv-form">
            <TextField
              label="Project name"
              value={p.name}
              onChange={(v) => set({ ...p, name: v })}
            />
            <TextField
              label="Location"
              value={p.location}
              onChange={(v) => set({ ...p, location: v })}
            />
            <TextField
              label="Forecast start (first of month)"
              value={p.startDate}
              type="date"
              onChange={(v) => set({ ...p, startDate: v })}
            />
            <TextField
              label="Original acquisition date"
              value={p.acquisitionDate}
              type="date"
              onChange={(v) => set({ ...p, acquisitionDate: v })}
            />
            {n("months", "Forecast months (12–120)")}
            {n(
              "price",
              p.strategy.startsWith("development")
                ? "Land / acquisition cost"
                : "Acquisition price",
            )}
            {n("closing", "Closing costs")}
            {n("initialCapex", "Capital funded at time zero")}
            {n("openingCash", "Opening project cash funded in initial equity")}
            {n("minimumCash", "Minimum retained project cash")}
            {p.strategy === "existing" &&
              n("asOfEquity", "As-of owner equity / opportunity cost")}
            {n("rentGrowth", "General annual rent growth", true)}
            {n("creditLoss", "Collection loss on billed rent", true)}
            {n("otherMonthly", "Other monthly income")}
            {n("management", "Management share of effective income", true)}
            {n("reservesMonthly", "Monthly below-NOI reserve funding")}
            {n("exitCap", "Terminal rental cap rate", true)}
            {n("sellingCost", "Disposition transaction costs", true)}
            <Toggle
              label="Distribute cash above minimum monthly"
              value={p.distribute}
              onChange={(v) => set({ ...p, distribute: v })}
            />
            {p.strategy !== "development-sale" && (
              <Toggle
                label="Sell rental property at end of horizon"
                value={p.sellAtEnd}
                onChange={(v) => set({ ...p, sellAtEnd: v })}
              />
            )}
          </div>
          <p>
            Month 0 capital is separate from unit/budget spending. Existing mode
            does not charge the acquisition price again; enter current debt
            balances and as-of equity. Reserve funding is treated as
            spent/unavailable cash, with no automatic reserve release.
          </p>
        </Card>
      </details>
      <div className="adv-two">
        <Card title="Rent transition">
          <Plot
            values={m.rows.map((r) => r.rent)}
            labels={m.rows.map((r) => r.date)}
            title="Collected / billed rent before losses and concessions"
          />
        </Card>
        <Card title="Cash and equity funding">
          <Plot
            values={m.rows.map((r) => r.cash)}
            second={m.rows.map((r) => r.capitalCall)}
            labels={m.rows.map((r) => r.date)}
            title="Ending cash (navy) · owner capital calls (blue)"
          />
          <p>
            Lowest cumulative unfunded cash: {money(m.lowestUnfundedCash)}.
            Owner calls are shown separately, rather than assumed debt.
          </p>
        </Card>
      </div>
      <AnnualSummary m={m} />
    </>
  );
}
function AnnualSummary({ m }: { m: Forecast }) {
  const years = Array.from({ length: Math.ceil(m.rows.length / 12) }, (_, i) =>
    m.rows.slice(i * 12, i * 12 + 12),
  );
  return (
    <Card title="Annual roll-up of monthly forecast">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {[
                "Year",
                "Rent",
                "NOI",
                "Regular debt",
                "NOI DSCR",
                "Lender NCF DSCR",
                "CapEx",
                "Owner calls",
                "Distributions",
                "Ending debt",
              ].map((v) => (
                <th key={v}>{v}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((a, i) => {
              const sum = (k: keyof (typeof a)[number]) =>
                  a.reduce(
                    (s, r) =>
                      s + (typeof r[k] === "number" ? (r[k] as number) : 0),
                    0,
                  ),
                service = sum("debtService");
              return (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{money(sum("rent"))}</td>
                  <td>{money(sum("noi"))}</td>
                  <td>{money(service)}</td>
                  <td>{multiple(service ? sum("noi") / service : null)}</td>
                  <td>
                    {multiple(service ? sum("lenderNcf") / service : null)}
                  </td>
                  <td>{money(sum("capex"))}</td>
                  <td className="negative">{money(sum("capitalCall"))}</td>
                  <td>{money(sum("distribution"))}</td>
                  <td>{money(a.at(-1)?.balance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
function MonthlyTable({ p, m }: { p: Project; m: Forecast }) {
  const [from, setFrom] = useState(1),
    [to, setTo] = useState(p.months);
  return (
    <Card
      title="Monthly operating cash and funding ledger"
      note="Capital calls restore the minimum cash balance. Ending cash includes disclosed owner funding. Payoffs include maturity and exit obligations; regular service excludes balloons."
    >
      <div className="adv-form">
        <NumberField
          label="First month to display"
          value={from}
          onChange={setFrom}
        />
        <NumberField
          label="Last month to display"
          value={to}
          onChange={setTo}
        />
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {[
                "Month / date",
                "Occupied",
                "Rent",
                "NOI",
                "CapEx",
                "Reserves",
                "Regular debt",
                "Draws",
                "Refi proceeds",
                "Payoffs",
                "Fees",
                "Disposition receipts",
                "Before funding",
                "Owner call",
                "Distribution",
                "Ending cash",
                "Debt balance",
                "Owner flow",
              ].map((v) => (
                <th key={v}>{v}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.rows
              .filter((r) => r.month >= from && r.month <= to)
              .map((r) => (
                <tr key={r.month}>
                  <td>
                    {r.month} · {r.date}
                    {r.actual ? " · actual" : ""}
                  </td>
                  <td>{r.occupied}</td>
                  {(
                    [
                      "rent",
                      "noi",
                      "capex",
                      "reserves",
                      "debtService",
                      "draws",
                      "refinance",
                      "payoffs",
                      "fees",
                      "netSale",
                      "cashBefore",
                      "capitalCall",
                      "distribution",
                      "cash",
                      "balance",
                      "equityFlow",
                    ] as const
                  ).map((k) => (
                    <td
                      key={k}
                      className={
                        (k === "capitalCall" && r[k] > 0) || r[k] < 0
                          ? "negative"
                          : ""
                      }
                    >
                      {money(r[k])}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
