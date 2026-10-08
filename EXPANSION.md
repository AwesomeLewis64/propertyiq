# PropertyIQ monthly and development expansion

**2.1 update:** [DECISION_TOOLS.md](DECISION_TOOLS.md) documents added reconciliation, comparison, renovation, leasing, operating-record, absorption, source and case-study workflows. The limitations below describe the earlier monthly expansion where superseded by that update. Its 100-test evidence is historical; the latest update ran six focused checks and a build.

Status: **experimental / not reconciled to Walnut's records**. Targeted automated checks were added following the user's latest coding instructions: 40 expansion tests plus 60 annual-release tests pass. The expansion checks cover monthly event boundaries, cash conservation, debt transitions, sizing, partner allocations, entered tax assumptions, all import destinations, schema rejection, dated returns and seeded risk. They found and corrected residual development debt at liquidation, invalid calendar dates and negative reserve/income inputs. The annual workspace and the original tested source archive remain available. Passing tests do not certify every financial convention or replace source-workbook reconciliation.

Open the website and select **Monthly & development** in the header. The initial transition case and all newly created strategy presets are fictional examples. No real Walnut records have been imported or reconciled. In particular, the demo's price, rents, debt and returns must not be presented as Walnut's results.

## Implemented workflows

| Original limitation | New behavior | Remaining boundary |
|---|---|---|
| Rent increase timing | Each unit has dated renovation, availability, target-rent and renewal events | Deterministic inputs; no prediction of tenant decisions |
| Monthly cash needs | Operating cash, retained cash, capital calls and distributions by month | Owner calls assume owners can provide funding |
| Renovation/revenue connection | Unit downtime blocks rent; completion activates renovated rent; budgets spend across selected months | Equal monthly spending within a budget line; no contractor progress certification |
| Borrowing capacity | Minimum of DSCR, LTV and debt-yield limits; required debt reduction and equity change | Inputs must match lender conventions; multi-loan allocation is manual |
| Lender DSCR | Separate NCF reserve/adjustment inputs and IO/amortizing stress service | No claim of agency compliance or lender approval |
| Complex financing | Multiple loans, construction commitments, cost draws, floating-rate paths, caps, refis and payoff penalties | Simplified end-of-month transactions; no full lender-document simulation |
| Existing ownership | Existing-property starting equity, remaining loan terms, actual monthly statements and historical dated equity flows | Historical completeness and current balances require source reconciliation |
| Broader imports | Mapped CSV/XLSX sheets for units, monthly statements, categorized ledgers, expense schedules, budgets, lender terms, historical flows and scalar assumptions | Arbitrary workbook formulas are not translated or recalculated |
| Lease forecasting | Initial lease-end renewal or vacancy/relet, turnover downtime, concessions and annual renewal increases | One initial vacancy/relet event; complex subsequent lease events require updated schedules |
| Development | Land/acquisition cost, hard/soft budgets, contingency, capitalized interest, unit sale/release schedules or rental hold/permanent refi | Retainage, escrow releases, presales and legal approvals are tracked as evidence, not modeled automatically |
| Expenses | Per-category growth, scheduled annual replacement and monthly reimbursement | One scheduled replacement per expense row; additional changes can use additional timed rows |
| Market/diligence | Local evidence files, source links, comp summaries, review statuses, owners, due dates and checklist | Review status is user-recorded; no external market feed or independent legal/physical verification |
| Investor/tax returns | Dated XIRR, NPV, ownership splits, simple preferred/capital/promote waterfall and entered-rate tax scenario | No catch-up, clawback, multi-hurdle waterfall, jurisdiction logic or partner-specific tax allocation |
| Portfolio/team workflow | Up to 100 projects, comparison, calendar owner-funding aggregation, browser autosave, complete JSON/file backups and 100 named revisions | Shared online accounts deferred by user preference; author names are self-reported |
| Probabilistic risk | Monthly sensitivity grids, combined delay/cost/rent stress and seeded worker-based Monte Carlo | Probabilities describe assumed ranges/dependence; incomplete trials are disclosed and excluded |

## Financial conventions

Forecast starts on the first day of a month. Initial equity is a time-zero contribution. Subsequent operating, debt and equity flows are month-end. The horizon is 12–120 months, with up to 500 units and 20 loans. Whole-month schedules are used. General annual growth compounds as a fractional year.

Initially vacant units lease at entered market rent from their availability month. Renovation start/duration blocks revenue and spreads unit renovation cost across the downtime. A completed renovation, rent target or vacancy/relet is a dated rent event; the latest event controls the rent. The entered amount applies in its effective month. General growth begins after that event. Renewal increases apply at annual renewal dates after the last rent-setting event. General growth and renewal increases can compound together: set general growth to zero if renewals already express the full intended increase. Collection loss applies after concessions; physical vacancy is modeled directly, never deducted again as a blanket percentage.

Each expense category has its own annual growth, start month and optional dated replacement annual amount. Monthly reimbursements are separate income. Management is a percentage of effective income. Monthly reserves are below NOI, treated as unavailable/spent cash, without terminal release. Budget lines and per-unit renovation spending must not duplicate the same costs.

Funded term debt uses a nominal annual rate divided by 12. IO consumes the original/remaining amortization term, then amortizes over the remaining months. Floating-rate changes recast payment over the remaining amortization using entered all-in rates, capped at the ceiling. A construction loan is a commitment: eligible costs draw up to the cost-share and remaining commitment. Draws are at month start; interest accrues on the drawn balance. Capitalized interest uses commitment capacity, with excess interest paid in cash. Multiple construction facilities fund remaining eligible costs sequentially in their listed order.

Refinancing happens after that month's regular debt payment. Enter a replacement amount or size it from the next 12 months of NOI divided by exit cap times refi LTV. The new borrowing repays existing principal and funds entered fees/penalties. Maturity without refi pays a balloon from cash; any shortfall is explicitly an owner capital call. It is not assumed replacement debt. Refi schedules, payoff fees and other funding assumptions must be reconciled to lender documents.

Rental exit value is next-12-month NOI divided by cap rate, less selling costs, loan payoff and entered payoff penalties. Development sales use explicit gross prices and sale months for each unit, with entered debt-release percentages. Remaining development debt is paid at terminal liquidation, even when its contractual maturity lies beyond the forecast horizon; cash shortages become disclosed owner calls. Incomplete sales or nonpositive rental exit NOI suppress project return metrics. With no terminal sale, returns include cash distributions only and exclude retained property value.

Opening cash is funded in initial equity. The monthly cash ledger first applies operating cash, CapEx, reserves, regular debt, draws/refis/payoffs, fees and disposition receipts. A shortfall to the minimum retained cash is an owner contribution. Excess cash can be distributed monthly or retained until terminal liquidation. XIRR and equity multiple use actual owner contributions/distributions, not loan proceeds. Existing-property forward returns begin with entered as-of equity; since-acquisition returns use dated historical owner flows instead of that as-of amount. Historical flows must be complete.

XIRR and NPV use actual dates with a 365-day year. Multiple sign changes suppress XIRR rather than assume a unique root. NPV remains available for supported complete cash flows. Partner waterfall calls follow ownership percentages; the optional noncompounding preferred return accrues monthly on unreturned capital. Distributions pay preferred then capital (or the reverse if selected), then promote to the selected sponsor and ownership shares on residual cash. There is no catch-up or clawback.

The optional tax scenario uses entered ordinary/capital/recapture rates and entered basis/depreciation. It does not choose legal depreciation or tax rates. Estimated taxes are investor-level cash outflows outside the retained-cash ledger. Development basis is allocated uniformly per unit. Prior depreciation, capitalized-interest treatment, loss limits and partner allocations are not modeled. Do not represent this as a tax return calculation.

## Imports and local persistence

The first row must contain headers. Select a worksheet and map source columns to destination fields. Required mappings, duplicates, numbers and project assumptions are validated before applying. Percent text such as `6%` or decimal fractions such as `0.06` are accepted. Dates use ISO format; native Excel dates are normalized. General-ledger rows require explicit categories and positive gross income/outflow amounts. No accounting categorization is inferred. Applying an import replaces that selected collection, preserves other project inputs and attaches the original file locally for provenance.

The fictional multi-sheet example is `public/samples/advanced-fictional-workbook.xlsx`, with separate Units, Monthly actuals, Expenses, Budget, Lender quote, Historical equity, Ledger and Assumptions tabs. Smaller CSV examples are alongside it. Timeline columns accept forecast-month numbers or ISO dates; dates are converted to the containing forecast month, and pre-forecast events become zero (disabled) for explicit review.

Imported units do not inherit fictional market rents, renewal increases or sale prices. Missing events are disabled; a vacant unit without a supplied availability month remains unleased through the horizon and forward exit period. Enter explicit availability and market rent to forecast lease-up. In existing-property mode, entered as-of owner equity should include the opening project cash and all relevant net assets.

Actual monthly statements replace entire matched monthly rent, other income, operating expense, CapEx and debt-service amounts. Matched actuals do not change loan balances or unit status. Forecast-only budget is compared separately. Reported up-to-12-period sums do not fill missing months or claim a complete T12. Historical actual periods outside the forecast remain available for review.

Browser autosave stores valid project inputs; invalid drafts pause autosave. Evidence files use IndexedDB. A complete JSON backup includes referenced files and revisions. Restore imports new project/file copies instead of overwriting existing projects/files. A missing referenced file blocks a complete backup. Named revisions record full project snapshots; the latest 100 are retained. Archiving a project preserves a revision for restoration. Browser data can be cleared; export independent backups. Neither browser storage nor a self-reported author field is secure team authentication or a tamper-proof audit log.

## Risk assumptions

Monte Carlo uses seeded pseudorandom inputs and uniform marginal rent/sale-price, cap-rate, capital-cost and delay ranges. An adverse-factor Gaussian dependence assumption links unfavorable outcomes. Trials remove recorded actuals and stress the operating plan. Delays move renovation starts, unit availability, rent targets and unit sale schedules. Loan maturity and initial lease expiry remain fixed. Incomplete/invalid trials are excluded and counted explicitly. Nominal capital loss means distributions below contributions; negative NPV means underperforming the entered required return. They are different measures. Neither is a calibrated real-world probability.

## Additional verification before financial reliance

Targeted automated coverage exists for the cases described above. Broader combinations, independent reference models and real Walnut records still need review:

- Reconcile a real Walnut case against its original workbook, including current versus target rents and adjusted NOI.
- Independently verify unit event boundaries, rent precedence, renovation cost totals and cash conservation.
- Reconcile every debt record: opening + draws + capitalized interest − principal − payoff + refi = ending balance.
- Verify IO, floating-rate resets, construction commitment exhaustion, maturity cash calls and sale/refi occurring in the same month.
- Validate DSCR/LTV/yield sizing and the incremental equity including fees.
- Independently benchmark dated XIRR/NPV, project and partner waterfall cash conservation, historical return substitution and tax assumptions.
- Check development sell/hold timing, unit sales before delivery, incomplete terminal cases and forward rental valuation.
- Exercise mapped imports, schema rejection, actual variance, autosave failure, backups with files and restore without overwrites.
- Verify deterministic risk seeds, assumed dependence, incomplete-trial accounting and stale-result notices.
- Complete desktop/mobile accessibility, navigation, console and full workflow checks.

Primary references: [Microsoft XIRR](https://support.microsoft.com/en-us/excel/functions/xirr-function), [Fannie Mae underwritten DSCR definition](https://mfguide.fanniemae.com/node/1541), [OCC CRE lending handbook](https://www.occ.treas.gov/publications-and-resources/publications/comptrollers-handbook/files/commercial-real-estate-lending/pub-ch-commercial-real-estate.pdf). These references explain concepts; they do not certify this implementation or Walnut's assumptions.
