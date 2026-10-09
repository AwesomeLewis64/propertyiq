import LoadingFeedback from "./ui/LoadingFeedback";
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
import { originOf, provenance } from "./data/provenance";
import { download, projectionCsv, debtCsv } from "./data/export";
import LocalAnalyses from "./ui/LocalAnalyses";
import { freshAnalysis } from "./data/storage";
import OperatingSummary from "./ui/OperatingSummary";
import { CashTable, DebtTable } from "./ui/Tables";
import Methodology from "./ui/Methodology";
import { navigate, readRoute } from "./ui/routes";
import Verdict, { verdictLines } from "./ui/verdict";
import { isAssumptions } from "./data/storage";
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
      "Annual IRR",
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
    () => readRoute().mode === "monthly",
  );
  const [launch, setLaunch] = useState<WorkspaceLaunch | undefined>();
  const [a, setA] = useState<Assumptions>(() => {
    try {
      const saved: unknown = JSON.parse(
        sessionStorage.getItem("propertyiq:quick:draft") ?? "null",
      );
      return isAssumptions(saved)
        ? { ...saved, origin: originOf(saved) }
        : structuredClone(demo);
    } catch {
      return structuredClone(demo);
    }
  });
  const [view, setViewState] = useState<View>(
    () => (readRoute().section as View) ?? "overview",
  );
  const setView = (v: View) => {
    setViewState(v);
    navigate(`#quick/${v}`);
  };
  const [home, setHome] = useState(() => readRoute().mode === "home");
  const [mobileEdited, setMobileEdited] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioSettings>({
    upside: {},
    downside: {},
  });
  const m = useMemo(() => calculate(a), [a]);

  useEffect(() => {
    const restore = () => {
      const route = readRoute();
      if (route.mode === "monthly") {
        setAdvanced(true);
        setHome(false);
      } else if (route.mode === "quick") {
        setAdvanced(false);
        setHome(false);
        setViewState(
          [
            "overview",
            "cash",
            "debt",
            "sensitivity",
            "import",
            "report",
            "methodology",
          ].includes(route.section ?? "")
            ? (route.section as View)
            : "overview",
        );
      } else if (!window.location.hash || window.location.hash === "#home") {
        setAdvanced(false);
        setHome(true);
      }
    };
    window.addEventListener("hashchange", restore);
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("hashchange", restore);
      window.removeEventListener("popstate", restore);
    };
  }, []);
  useEffect(() => {
    if (isAssumptions(a)) {
      try {
        sessionStorage.setItem("propertyiq:quick:draft", JSON.stringify(a));
      } catch {
        /* Current draft remains available in memory. */
      }
    }
  }, [a]);
  useEffect(() => {
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
    navigate(
      next?.project
        ? `#monthly/${encodeURIComponent(next.project.id)}/${next.tab ?? "overview"}`
        : "#monthly",
    );
  };
  if (advanced)
    return (
      <Suspense
        fallback={
          <LoadingFeedback label="Opening monthly workspace…" skeleton />
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
            navigate("#home");
          }}
          onBack={() => {
            setLaunch(undefined);
            setAdvanced(false);
            setHome(false);
            navigate("#quick/overview");
          }}
        />
      </Suspense>
    );
  if (home)
    return (
      <StartPage
        onOpen={openMonthly}
        onAnnual={(next) => {
          setA(next ?? structuredClone(demo));
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
            navigate("#home");
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
            Monthly planner
          </button>
          <button className="button primary small" onClick={open}>
            Quick analysis
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
                {nav.find((n) => n.id === view)?.label ?? "Investment overview"}
              </h1>
              <span className="badge">
                {a.mode === "manual"
                  ? "Manual underwriting"
                  : "Current rent roll"}
              </span>
              <p>
                {a.name || "Untitled property"} ·{" "}
                {a.location || "Location not specified"} <span>·</span>{" "}
                {Number.isFinite(a.units) ? a.units : "—"} units <span>·</span>{" "}
                {a.hold}-year hold
              </p>
            </div>
            <div className="workspace-actions">
              <button
                className="button small"
                onClick={() => {
                  if (
                    !window.confirm(
                      "Replace the current analysis with fictional example assumptions? Saved snapshots will remain available.",
                    )
                  )
                    return;
                  setA(structuredClone(demo));
                  setScenarios({ upside: {}, downside: {} });
                }}
              >
                <RotateCcw size={14} />
                Reset to example
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
            Browser-local model <span>{provenance(a)}</span>
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
            {!m.errors.length && (
              <div className="mobile-summary">
                Annual IRR {pct(m.irr)} · Multiple {multiple(m.multiple)} · DSCR{" "}
                {multiple(m.years[0]?.dscr ?? null)}
              </div>
            )}
            <details
              className="mobile-assumptions"
              open
              onBlur={(e) => {
                if (
                  mobileEdited &&
                  window.innerWidth <= 700 &&
                  !e.currentTarget.contains(e.relatedTarget as Node | null)
                )
                  e.currentTarget.open = false;
              }}
            >
              <summary>Edit assumptions</summary>
              <Inputs
                a={a}
                set={(next) => {
                  setA(next);
                  setMobileEdited(true);
                }}
              />
            </details>
            <div className="analysis-content">
              {view === "methodology" ? (
                <Methodology />
              ) : view === "import" ? (
                <Suspense
                  fallback={
                    <LoadingFeedback label="Loading import…" skeleton />
                  }
                >
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
                      {a.vacancy === 0 &&
                        a.creditLoss === 0 &&
                        a.closingCosts === 0 &&
                        a.rentGrowth === 0 && (
                          <div className="alert" role="status">
                            Assumptions incomplete: vacancy, credit loss, closing
                            costs and rent growth are all zero, which makes
                            returns look better than most real deals. Review
                            them under Assumptions before relying on these
                            results.
                          </div>
                        )}
                      <Verdict
                        engine="Quick analysis · annual cash flows"
                        lines={verdictLines(
                          m.years[0].dscr,
                          m.irr,
                          a.requiredReturn ?? 0.1,
                          m.years[0].noi / a.price,
                          m.effectiveExitCap ?? a.exitCap,
                        )}
                      />
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
                          <LoadingFeedback label="Loading charts…" skeleton />
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
                      fallback={
                        <LoadingFeedback
                          label="Loading sensitivity…"
                          skeleton
                        />
                      }
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
                      fallback={
                        <LoadingFeedback label="Loading report…" skeleton />
                      }
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
