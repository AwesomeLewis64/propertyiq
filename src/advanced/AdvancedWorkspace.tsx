import LoadingFeedback from "../ui/LoadingFeedback";
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
  FolderOpen,
  ShieldCheck,
  Home,
} from "lucide-react";
import Brand from "../ui/Brand";
import ThemeToggle from "../ui/ThemeToggle";
import { toolMatch } from "./toolTopics";
import { Select } from "./Controls";
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
import { provenance } from "../data/provenance";
import { money, pct, multiple } from "../ui/format";
import { csvText, download } from "../data/export";

import { sampleProject } from "../ui/startFlow";
import { navigate, readRoute } from "../ui/routes";
import { Overview, MonthlyTable } from "./WorkspaceResults";
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
      workspace: w.projects.length ? w : { ...w, projects: [sampleProject()] },
      error: "",
      locked: false,
    };
  } catch (e) {
    return {
      workspace: {
        version: 2 as const,
        projects: [sampleProject()],
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
        loaded.workspace.projects.length < 100 &&
        !loaded.workspace.projects.some((p) => p.id === initialProject.id)
      )
        loaded.workspace = {
          ...loaded.workspace,
          projects: [...loaded.workspace.projects, initialProject],
        };
      return loaded;
    }),
    [workspace, setWorkspace] = useState<Workspace>(loaded.workspace),
    [selected, setSelectedState] = useState(
      loaded.workspace.projects.find(
        (p) => p.id === (initialProject?.id ?? readRoute().project),
      )?.id ?? loaded.workspace.projects[0].id,
    ),
    [tab, setTabState] = useState<Tab>(
      initialTab ??
        (tabs.some(([id]) => id === readRoute().section)
          ? (readRoute().section as Tab)
          : "overview"),
    ),
    [showMore, setShowMore] = useState(false),
    [toolSearch, setToolSearch] = useState(""),
    [traceMetric, setTraceMetric] = useState<MetricKey>("noi"),
    [saveError, setSaveError] = useState(loaded.error),
    [saveTime, setSaveTime] = useState(""),
    [newStrategy, setNewStrategy] =
      useState<Project["strategy"]>("acquisition");
  const p =
    workspace.projects.find((p) => p.id === selected) ?? workspace.projects[0];
  const m = useMemo(() => forecast(p), [p]);
  const setSelected = (id: string) => {
    setSelectedState(id);
    navigate(`#monthly/${encodeURIComponent(id)}/${tab}`);
  };
  const setTab = (next: Tab) => {
    setTabState(next);
    navigate(`#monthly/${encodeURIComponent(selected)}/${next}`);
  };
  useEffect(() => {
    const restore = () => {
      const route = readRoute();
      if (route.mode !== "monthly") return;
      if (workspace.projects.some((q) => q.id === route.project))
        setSelectedState(route.project!);
      if (tabs.some(([id]) => id === route.section))
        setTabState(route.section as Tab);
    };
    window.addEventListener("hashchange", restore);
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("hashchange", restore);
      window.removeEventListener("popstate", restore);
    };
  }, [workspace.projects]);
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
    try {
      if (workspace.projects.some((p) => forecast(p).errors.length)) return;
      persistWorkspace(workspace);
      setSaveTime(new Date().toLocaleTimeString());
      setSaveError("");
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Local save failed. Export a backup.",
      );
    }
  }, [workspace, loaded.locked]);
  const create = () => {
    if (workspace.projects.length >= 100) return;
    const n =
      newStrategy === "acquisition"
        ? { ...sampleProject(), id: uid() }
        : newProject(newStrategy);
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
    const text = `# ${p.name}\n\n${provenance(p)}\n\nStrategy: ${p.strategy}\nForecast start: ${p.startDate}; ${p.months} months\nInitial/as-of equity: ${money(m.initialEquity)}\nForecast XIRR: ${pct(m.irr)}\nNPV at ${pct(p.discount)}: ${money(m.npv)}\nEquity multiple: ${multiple(m.multiple)}\nAdditional owner funding: ${money(m.additionalEquity)}\nDebt capacity: ${money(m.sizing.maximum)} (${m.sizing.binding})\n\n## Modeling assumptions\n\nUnit schedules, expenses and financing are user-entered. Cash shortfalls are funded by disclosed owner contributions. Dated returns use a 365-day year. Taxes are illustrative entered-rate scenarios.\n\n## Warnings\n\n${m.warnings.map((w) => `- ${w}`).join("\n")}\n\n## Diligence\n\n${p.tasks.map((t) => `- [${t.status === "complete" ? "x" : " "}] ${t.title}: ${t.owner || "unassigned"}; due ${t.due || "unspecified"}; ${t.note}`).join("\n")}\n\n## Evidence\n\n${p.evidence.map((e) => `- ${e.title}: ${e.status}; ${e.date}; ${e.source}; ${e.note}`).join("\n")}`;
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
        <span className="adv-header-label">MONTHLY PLANNER</span>
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
            Quick analysis
          </button>
          <ThemeToggle />
        </div>
      </header>
      <div className="adv-shell">
        <aside className="planner-sidebar">
          <label className="iq-tool-search">
            <Search size={15} />
            <input
              value={toolSearch}
              onChange={(e) => setToolSearch(e.target.value)}
              placeholder="Search tools or topics"
              aria-label="Find a workspace tool"
            />
          </label>
          <nav aria-label="Property analysis tools">
            {navGroups.map((group) => {
              const visible = tabs.filter(
                ([id, label]) =>
                  group.ids.includes(id) &&
                  (showMore ||
                    !!toolSearch ||
                    [
                      "overview",
                      "report",
                      "units",
                      "monthly",
                      "finance",
                      "expenses",
                      "imports",
                      "decisionlab",
                    ].includes(id)) &&
                  toolMatch(id, label, toolSearch) !== null,
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
                      {toolMatch(id, label, toolSearch) && (
                        <small className="iq-tool-hit">
                          {toolMatch(id, label, toolSearch)}
                        </small>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
            {toolSearch &&
              !tabs.some(
                ([id, label]) => toolMatch(id, label, toolSearch) !== null,
              ) && <p className="iq-no-tools">No matching tools.</p>}
          </nav>
          <button
            className="button small more-tools"
            aria-expanded={showMore}
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? "Fewer tools" : "More tools"}
          </button>
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
                MONTHLY PLANNER · DATED CASH FLOWS
              </span>
              <h1>{tabs.find((t) => t[0] === tab)?.[1]}</h1>
              <p>
                {p.name} · {p.location || "Location not supplied"} ·{" "}
                {p.units.length} units · {p.months}-month forecast
              </p>
            </div>
            <div className="adv-actions">
              {tab !== "report" && (
                <button
                  className="button primary small"
                  onClick={() => setTab("report")}
                >
                  <FileText size={15} />
                  View report
                </button>
              )}
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
          <div className="compact-project-header">
            <p className="project-origin">{provenance(p)}</p>
            <details className="iq-model-status">
              <summary>
                <ShieldCheck size={15} />
                Model status: source reconciliation required
              </summary>
              <p>
                Review source documents and lender terms before relying on
                results.
              </p>
            </details>
            <div className="adv-project-bar">
              <Select
                label="Active local project"
                value={p.id}
                onChange={setSelected}
                options={workspace.projects.map((p) => [p.id, p.name])}
              />
              <details className="project-management no-print">
                <summary className="button small">Project actions</summary>
                <div>
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
                    disabled={
                      workspace.projects.length >= 100 || !!m.errors.length
                    }
                    onClick={() => {
                      const n = {
                        ...structuredClone(p),
                        id: uid(),
                        name: `${p.name} (copy)`,
                      };
                      setWorkspace((w) => ({
                        ...w,
                        projects: [...w.projects, n],
                      }));
                      setSelected(n.id);
                    }}
                  >
                    <Copy size={14} />
                    Duplicate
                  </button>
                </div>
              </details>
              <small>
                {m.errors.length
                  ? "Autosave paused: invalid draft"
                  : saveTime
                    ? `Browser saved ${saveTime}`
                    : "Saving locally…"}
              </small>
            </div>
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
            fallback={
              <LoadingFeedback label="Opening workspace tools…" skeleton />
            }
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
              human review. Projects and uploaded files stay in this browser.
              Tax and waterfall calculations are configurable simplified
              scenarios. This expansion has targeted regression coverage; it has
              not been reconciled against source workbooks.
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
