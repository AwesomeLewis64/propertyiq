import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  LayoutDashboard,
  Table2,
  Landmark,
  BookOpen,
  ShieldCheck,
  RotateCcw,
  SlidersHorizontal,
  FileText,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { demo } from "./finance/demo";
import { calculate } from "./finance/model";
import type { Assumptions, Model } from "./finance/types";
import { money, pct, multiple } from "./ui/format";
import Inputs from "./ui/Inputs";
import StartPage from "./ui/StartPage";
import Brand from "./ui/Brand";
import LegalShell from "./ui/LegalShell";
import type { WorkspaceLaunch } from "./ui/startFlow";
const Charts = lazy(() => import("./ui/Charts"));
const Sensitivity = lazy(() => import("./ui/Sensitivity"));
const Report = lazy(() => import("./ui/Report"));
const ImportRentRoll = lazy(() => import("./ui/ImportRentRoll"));
const AdvancedWorkspace = lazy(() => import("./advanced/AdvancedWorkspace"));
import type { ScenarioSettings } from "./ui/Sensitivity";
import Insights from "./ui/Insights";
import { download, projectionCsv, debtCsv } from "./data/export";
import LocalAnalyses from "./ui/LocalAnalyses";
import { freshAnalysis } from "./data/storage";
import OperatingSummary from "./ui/OperatingSummary";
import { CashTable, DebtTable } from "./ui/Tables";
import Methodology from "./ui/Methodology";
type View =
  | "overview"
  | "cash"
  | "debt"
  | "sensitivity"
  | "import"
  | "report"
  | "methodology";
function Metrics({ m, a }: { m: Model; a: Assumptions }) {
  const y = m.years[0];
  const data = [
    [
      "Acquisition price",
      money(a.price),
      "Purchase price, before transaction costs",
    ],
    [
      "Initial equity",
      money(m.initialEquity),
      "Price + closing costs + initial CapEx + loan fees − loan proceeds",
    ],
    [
      "Year 1 NOI",
      money(y.noi),
      "Effective gross income minus operating expenses; excludes reserves and debt",
    ],
    [
      "Going-in cap rate",
      pct(y.noi / a.price),
      "Year 1 NOI divided by acquisition price",
    ],
    [
      "Levered IRR",
      pct(m.irr),
      m.irrReason ?? "Annual equity cash-flow IRR, including sale",
    ],
    [
      "Equity multiple",
      multiple(m.multiple),
      "Total positive distributions / total equity contributions",
    ],
    [
      "Year 1 cash-on-cash",
      pct(y.operatingCash !== null ? y.operatingCash / m.initialEquity : null),
      "Operating equity cash flow / initial equity; excludes sale",
    ],
    [
      "Year 1 DSCR",
      multiple(y.dscr),
      "NOI / annual regular debt service; no debt displays N/A",
    ],
  ];
  return (
    <div className="metrics">
      {data.map(([label, value, help], i) => (
        <div className={`metric ${i === 4 ? "accent-metric" : ""}`} key={label}>
          <span title={help}>
            {label}
            <span
              className="help"
              tabIndex={0}
              aria-label={`${label}: ${help}`}
              title={help}
            >
              i
            </span>
          </span>
          <strong>{value}</strong>
          <small>
            {i === 4
              ? "Annual equity return"
              : i === 5
                ? "Over the investment hold"
                : i === 7
                  ? "Income / debt service"
                  : i === 6
                    ? "Before sale proceeds"
                    : i === 2
                      ? "Before financing & reserves"
                      : i === 3
                        ? "NOI / acquisition price"
                        : i === 1
                          ? "Includes acquisition costs"
                          : `${a.units.toLocaleString()} residential units`}
          </small>
        </div>
      ))}
    </div>
  );
}
export default function App() {
  return (
    <LegalShell>
      <WorkspaceApp />
    </LegalShell>
  );
}
function WorkspaceApp() {
  const [advanced, setAdvanced] = useState(
    () => window.location.hash === "#monthly",
  );
  const [launch, setLaunch] = useState<WorkspaceLaunch | undefined>();
  const [a, setA] = useState<Assumptions>(() => structuredClone(demo));
  const [view, setView] = useState<View>("overview");
  const [home, setHome] = useState(true);
  const [scenarios, setScenarios] = useState<ScenarioSettings>({
    upside: {},
    downside: {},
  });
  const m = useMemo(() => calculate(a), [a]);
  const isDemo = JSON.stringify(a) === JSON.stringify(demo);
  useEffect(() => {
    if (advanced) window.history.replaceState(null, "", "#monthly");
    else if (window.location.hash === "#monthly")
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    if (advanced) return;
    document.title = home
      ? "PropertyIQ | Multifamily Investment Analytics"
      : `PropertyIQ | ${view === "overview" ? "Investment overview" : view === "cash" ? "Cash flows" : view === "debt" ? "Debt schedule" : view === "sensitivity" ? "Sensitivity analysis" : view === "import" ? "Rent-roll import" : view === "report" ? "Investment report" : "Methodology"}`;
  }, [home, view, advanced]);
  const nav = [
    {
      id: "overview" as const,
      label: "Investment overview",
      icon: LayoutDashboard,
    },
    { id: "cash" as const, label: "Cash flows", icon: Table2 },
    { id: "debt" as const, label: "Debt schedule", icon: Landmark },
    {
      id: "sensitivity" as const,
      label: "Sensitivity",
      icon: SlidersHorizontal,
    },
    { id: "import" as const, label: "Rent roll import", icon: FileSpreadsheet },
    { id: "report" as const, label: "Investment report", icon: FileText },
    { id: "methodology" as const, label: "Methodology", icon: BookOpen },
  ];
  const open = () => {
    setHome(false);
    setView("overview");
    document.title = "PropertyIQ | Investment Workspace";
  };
  const openMonthly = (next?: WorkspaceLaunch) => {
    setLaunch(next);
    setHome(false);
    setAdvanced(true);
  };
  if (advanced)
    return (
      <Suspense
        fallback={
          <div className="panel panel-padding" role="status">
            Opening monthly workspace…
          </div>
        }
      >
        <AdvancedWorkspace
          initialProject={launch?.project}
          initialTab={launch?.tab}
          initialFile={launch?.file}
          initialDecision={launch?.decision}
          onHome={() => {
            setLaunch(undefined);
            setAdvanced(false);
            setHome(true);
          }}
          onBack={() => {
            setLaunch(undefined);
            setAdvanced(false);
            setHome(false);
          }}
        />
      </Suspense>
    );
  if (home)
    return (
      <StartPage
        onOpen={openMonthly}
        onAnnual={() => {
          setHome(false);
          setView("overview");
        }}
      />
    );
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="topbar annual-topbar">
        <button
          className="brand"
          onClick={() => {
            setHome(true);
            document.title = "PropertyIQ | Multifamily Investment Analytics";
          }}
        >
          <Brand />
        </button>
        <div className="topbar-links">
          <span className="top-label">MULTIFAMILY INVESTMENT ANALYTICS</span>
          <span className="privacy-pill">
            <ShieldCheck size={14} />
            Private by design
          </span>
          <button
            className="button small advanced-launch"
            onClick={() => openMonthly()}
          >
            Monthly & development
          </button>
          <button className="button primary small" onClick={open}>
            {home ? "Open workspace" : "Workspace"}
            <ArrowUpRight size={15} />
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className="nav-sidebar">
          <span className="nav-label">ANALYSIS WORKSPACE</span>
          <nav>
            {nav.map((n) => (
              <button
                key={n.id}
                title={n.label}
                aria-current={view === n.id ? "page" : undefined}
                className={view === n.id ? "active" : ""}
                onClick={() => setView(n.id)}
              >
                <n.icon size={17} />
                {n.label}
              </button>
            ))}
          </nav>
          <div className="sidebar-note">
            <ShieldCheck size={20} />
            <strong>Your data stays here.</strong>
            <p>
              Calculations run locally. No registration or paid service
              required.
            </p>
          </div>
        </aside>
        <main className="workspace-main" id="main-content">
          <div className="workspace-heading">
            <div>
              <div className="breadcrumbs">
                Workspace <span>/</span> Multifamily acquisition
              </div>
              <h1>
                {a.name || "Untitled property"}
                <span className="badge">
                  {a.mode === "manual"
                    ? "Manual underwriting"
                    : "Current rent roll"}
                </span>
              </h1>
              <p>
                {a.location || "Location not specified"} <span>·</span>{" "}
                {Number.isFinite(a.units) ? a.units : "—"} units <span>·</span>{" "}
                {a.hold}-year hold
              </p>
            </div>
            <div className="workspace-actions">
              <button
                className="button small"
                onClick={() => {
                  setA(structuredClone(demo));
                  setScenarios({ upside: {}, downside: {} });
                }}
              >
                <RotateCcw size={14} />
                Reset to demo
              </button>
              <button
                className="button small"
                disabled={m.errors.length > 0}
                onClick={() =>
                  download("propertyiq-projections.csv", projectionCsv(a, m))
                }
              >
                <Download size={14} />
                Cash flow CSV
              </button>
              <button
                className="button small"
                disabled={m.errors.length > 0}
                onClick={() => download("propertyiq-debt.csv", debtCsv(m))}
              >
                Debt CSV
              </button>
              <button
                className="button small primary"
                onClick={() => setView("report")}
              >
                <FileText size={14} />
                Report
              </button>
            </div>
          </div>
          <div className="model-notice">
            <span className="dot" />
            Browser-local model{" "}
            <span>
              {isDemo
                ? "Fictional sample assumptions · edit to analyze your property"
                : "Your assumptions · calculated locally in your browser"}
            </span>
          </div>
          <LocalAnalyses
            a={a}
            scenarios={scenarios}
            onNew={() => {
              setA(freshAnalysis());
              setScenarios({ upside: {}, downside: {} });
              setView("overview");
            }}
            onLoad={(saved) => {
              setA(saved.assumptions);
              setScenarios(saved.scenarios);
              setView("overview");
            }}
          />
          <div className="analysis-layout">
            <Inputs a={a} set={setA} />
            <div className="analysis-content">
              {view === "methodology" ? (
                <Methodology />
              ) : view === "import" ? (
                <Suspense fallback={<div role="status">Loading import…</div>}>
                  <ImportRentRoll a={a} onApply={setA} />
                </Suspense>
              ) : m.errors.length > 0 ? (
                <section className="alert error" role="alert">
                  <h2>Check your assumptions</h2>
                  <ul>
                    {m.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </section>
              ) : (
                <>
                  {m.warnings.map((w) => (
                    <div className="alert" key={w} role="status">
                      {w}
                    </div>
                  ))}
                  {view === "overview" ? (
                    <>
                      <Metrics m={m} a={a} />
                      <div className="results-heading">
                        <h2>Investment performance</h2>
                        <span>
                          <SlidersHorizontal size={13} />
                          Updates as you edit
                        </span>
                      </div>
                      <Suspense
                        fallback={
                          <div className="panel panel-padding" role="status">
                            Loading charts…
                          </div>
                        }
                      >
                        <Charts m={m} a={a} />
                      </Suspense>
                      <OperatingSummary a={a} m={m} />
                      <Insights
                        a={a}
                        m={m}
                        onNavigate={(v) => setView(v as View)}
                      />
                    </>
                  ) : view === "cash" ? (
                    <CashTable m={m} a={a} />
                  ) : view === "debt" ? (
                    <DebtTable m={m} />
                  ) : view === "sensitivity" ? (
                    <Suspense
                      fallback={<div role="status">Loading sensitivity…</div>}
                    >
                      <Sensitivity
                        a={a}
                        onApply={setA}
                        scenarios={scenarios}
                        onScenarios={setScenarios}
                      />
                    </Suspense>
                  ) : view === "report" ? (
                    <Suspense
                      fallback={<div role="status">Loading report…</div>}
                    >
                      <Report a={a} m={m} scenarios={scenarios} />
                    </Suspense>
                  ) : (
                    <Methodology />
                  )}
                </>
              )}
              <div className="analysis-footnote">
                Annual pre-tax projections · No refinancing assumed · Values
                rounded for display
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
