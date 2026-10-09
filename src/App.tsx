import LoadingFeedback from "./ui/LoadingFeedback";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import MobileDisclosure, { useNarrow } from "./ui/MobileDisclosure";
import { metricHelp } from "./ui/metricHelp";
import Brand from "./ui/Brand";
import ThemeToggle from "./ui/ThemeToggle";
import LegalShell from "./ui/LegalShell";
import type { WorkspaceLaunch } from "./ui/startFlow";
const Charts = lazy(() => import("./ui/Charts"));
const Sensitivity = lazy(() => import("./ui/Sensitivity"));
const Report = lazy(() => import("./ui/Report"));
const ImportRentRoll = lazy(() => import("./ui/ImportRentRoll"));
const AdvancedWorkspace = lazy(() => import("./advanced/AdvancedWorkspace"));
import type { ScenarioSettings } from "./ui/Sensitivity";
import Insights from "./ui/Insights";
import CountUp from "./ui/CountUp";
import DealSummary from "./ui/DealSummary";
import Sparkle from "./ui/Sparkle";
import { swap } from "./ui/viewTransition";
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
function Metrics({
  m,
  a,
  celebrate,
  onCelebrated,
}: {
  m: Model;
  a: Assumptions;
  celebrate: boolean;
  onCelebrated: () => void;
}) {
  const y = m.years[0];
  const data: [string, number | null, (v: number | null) => string, string][] =
    [
      ["Acquisition price", a.price, money, metricHelp["Acquisition price"]],
      ["Initial equity", m.initialEquity, money, metricHelp["Initial equity"]],
      ["Year 1 NOI", y.noi, money, metricHelp["Year 1 NOI"]],
      [
        "Going-in cap rate",
        y.noi / a.price,
        pct,
        metricHelp["Going-in cap rate"],
      ],
      ["Annual IRR", m.irr, pct, m.irrReason ?? metricHelp["Annual IRR"]],
      ["Equity multiple", m.multiple, multiple, metricHelp["Equity multiple"]],
      [
        "Year 1 cash-on-cash",
        y.operatingCash !== null ? y.operatingCash / m.initialEquity : null,
        pct,
        metricHelp["Year 1 cash-on-cash"],
      ],
      ["Year 1 DSCR", y.dscr, multiple, metricHelp["Year 1 DSCR"]],
    ];
  return (
    <div className="metrics">
      {data.map(([label, value, format, help], i) => (
        <div className={`metric ${i === 4 ? "accent-metric" : ""}`} key={label}>
          {i === 4 && celebrate && <Sparkle onDone={onCelebrated} />}
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
          <strong>
            <CountUp value={value} format={format} />
          </strong>
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
  const showView = (v: View) => {
    setViewState(v);
    navigate(`#quick/${v}`);
  };
  // Screen changes crossfade (View Transitions); back/forward stays instant.
  const setView = (v: View) => swap(() => showView(v));
  const [home, setHome] = useState(() => readRoute().mode === "home");
  const [mobileEdited, setMobileEdited] = useState(false);
  const narrow = useNarrow(700);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  // A new analysis opening to results gets one sparkle on its IRR (ADR-0006).
  const [celebrate, setCelebrate] = useState(false);
  const endCelebrate = useCallback(() => setCelebrate(false), []);
  const [scenarios, setScenarios] = useState<ScenarioSettings>({
    upside: {},
    downside: {},
  });
  const m = useMemo(() => calculate(a), [a]);
  // One highlight slides between sidebar items: to the hovered one, else the active one.
  const navRef = useRef<HTMLElement>(null);
  const [hoverNav, setHoverNav] = useState<View | null>(null);
  const [pill, setPill] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return setPill(null);
    const place = () => {
      const b = nav.querySelector<HTMLElement>(
        `[data-nav="${hoverNav ?? view}"]`,
      );
      if (b)
        setPill({
          x: b.offsetLeft,
          y: b.offsetTop,
          w: b.offsetWidth,
          h: b.offsetHeight,
        });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [view, hoverNav, home, advanced]);

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
  const open = () =>
    swap(() => {
      setHome(false);
      showView("overview");
      document.title = "PropertyIQ | Investment Workspace";
    });
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
        onAnnual={(next) =>
          swap(() => {
            setA(next ?? structuredClone(demo));
            setHome(false);
            showView("overview");
            setCelebrate(true);
          })
        }
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
          onClick={() =>
            swap(() => {
              setHome(true);
              navigate("#home");
              document.title = "PropertyIQ | Multifamily Investment Analytics";
            })
          }
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
          <ThemeToggle />
        </div>
      </header>
      <div className="workspace">
        <aside className="nav-sidebar">
          <span className="nav-label">ANALYSIS WORKSPACE</span>
          <MobileDisclosure
            max={700}
            closeOnPick
            title={`Section: ${nav.find((n) => n.id === view)?.label ?? "Investment overview"}`}
          >
            <nav ref={navRef} onMouseLeave={() => setHoverNav(null)}>
              {pill && (
                <span
                  className="nav-indicator"
                  data-hover={hoverNav && hoverNav !== view ? "" : undefined}
                  aria-hidden="true"
                  style={{
                    width: pill.w,
                    height: pill.h,
                    transform: `translate(${pill.x}px, ${pill.y}px)`,
                  }}
                />
              )}
              {nav.map((n) => (
                <button
                  key={n.id}
                  title={n.label}
                  aria-current={view === n.id ? "page" : undefined}
                  className={view === n.id ? "active" : ""}
                  data-nav={n.id}
                  onMouseEnter={() => setHoverNav(n.id)}
                  onClick={() => setView(n.id)}
                >
                  <n.icon size={17} />
                  {n.label}
                </button>
              ))}
            </nav>
          </MobileDisclosure>
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
          </div>
          {!m.errors.length && view !== "methodology" && view !== "import" && (
            <DealSummary
              a={a}
              m={m}
              onGo={(target) =>
                setView(target).then(() =>
                  document
                    .querySelector(
                      target === "overview" ? ".metrics" : ".analysis-content",
                    )
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                )
              }
            />
          )}
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
            <details
              className="mobile-assumptions"
              open={!narrow || assumptionsOpen}
              onToggle={(e) =>
                narrow && setAssumptionsOpen(e.currentTarget.open)
              }
              onBlur={(e) => {
                if (
                  mobileEdited &&
                  narrow &&
                  !e.currentTarget.contains(e.relatedTarget as Node | null)
                )
                  setAssumptionsOpen(false);
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
                  {view !== "report" &&
                    m.warnings.map((w) => (
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
                            Assumptions incomplete: vacancy, credit loss,
                            closing costs and rent growth are all zero, which
                            makes returns look better than most real deals.
                            Review them under Assumptions before relying on
                            these results.
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
                      <Metrics
                        m={m}
                        a={a}
                        celebrate={celebrate}
                        onCelebrated={endCelebrate}
                      />
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
