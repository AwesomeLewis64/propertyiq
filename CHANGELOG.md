# Changelog

## 2.5.0 — Trust, clarity and new transaction checks

- Start page: one primary action ("Start an analysis"), a "Try a sample" secondary, trust signals under them, and a quiet "Or start with a tool" group with a guided start. A border beam circles the primary button.
- Review screen: "Check these before you trust the returns"; vacancy, management and CapEx are editable, still 0 by default, and flagged. Plain-English helper text for exit cap, going-in cap, IO, amortization, DSCR and target return.
- Results first: the deal summary sits above exports and backups; on phones sections, planner tools and project controls fold behind one-line summaries and assumptions start closed.
- Report: one plain-language line per metric with a jump link to its methodology section; warnings print once.
- Saving: Quick shows last saved, unsaved changes and a backup reminder. Rent-roll import lists what will change, offers undo and a recovery path after a failed file. Sensitivity cells mark above/below target without color.
- New Quick analysis views: Refinance check (loan sizing, cash out, payment and DSCR change, months to repay closing costs) and Sell vs hold (cash today vs the hold case at your target return, return on equity, break-even exit cap).
- Fixes: top bars fit from 320px; planner tools wrap instead of scrolling sideways; the theme reveal covers the page evenly with no white corner; honest social metadata (no AI claim) with a new preview image.
- Start page hook: "Analyze cash flow and financing." with one line saying what to paste and what comes back; the social preview matches.
- Monthly planner forms share one control system: equal-height inputs, selects and file pickers, aligned label rows, identical action buttons, a steady project card (the model-status note opens as an overlay), a centered empty state for decisions, and long month-by-month tables that fold away with a row count.
- Pointer effects: the pinned sample card leans a few degrees toward the cursor from every side (inside a stationary hover zone, so edges do not flicker), and start-page text gives a small prismatic glint under the cursor. Both are off for reduced motion and touch.
- Tests: 236 unit tests and a six-project browser suite covering phone menus, import undo, save status, the guided start and the new views.

## 2.4.0 — Visuals and shipping verification

- Added reconciled cash-flow bridges, configurable sensitivity tornadoes in percentage points, and capital recovery with separate operating distributions and sale receipts.
- Added responsive keyboard/touch chart inspection, data tables and PNG/SVG/CSV exports carrying provenance and assumptions.
- Added persistent example/user/unknown provenance; removed unfinished-product labels and private test-property references.
- Formatted monthly monetary fields, distinguished blank actuals from zero, marked stale combined stress, and confirmed destructive actions.
- Added portable Quick backups; repaired WebKit evidence storage and prevented incomplete attachment backups from restoring silently.
- Improved mobile project actions and actual print/PDF layouts, including long holds and concise financial limitations.
- Expanded to 212 regressions and 91 passing browser checks across Chromium, Firefox and WebKit, with actual PDF and export evidence. Deployment remains pending the user's hosting choice.

## 2.3.0 — Financial fidelity and product review

- Replaced competing demos with one fictional value-add case: annual IRR 14.17%, 41.65% operating expense ratio and 62.5 bps exit-cap expansion.
- Added full amortization after IO, selectable original-term amortization, calendar actual/360 accrual and constrained loan sizing.
- Added category growth, capital inflation, optional sale-tax reassessment and 3–10 year holds.
- Added shared-engine parity checks and reproducible independent benchmark calculations.
- Put Quick analysis first; clarified Monthly planner; made setup assumptions editable and extraction preview explicit.
- Repaired project/section history and immediate autosave, currency focus edits, mobile width and navigation labels.
- Added verdict strips, eight monthly metrics, accessible chart legends, sensitivity target colors and a mobile summary.
- Added CI, ESLint, finance coverage gates, desktop/mobile Playwright and axe checks.
- Split monthly engine validation, operating logic, partner allocation and results into focused modules; consolidated the three stylesheets with shared tokens and removed redundant declarations.
- Replaced pending contact with abc@gmail.com and added launch/reconciliation guides.

## 2.2 — Setup and interface

- Added the description-led setup review, grouped searchable navigation and redesigned report styling.
- Added Privacy, Terms, Financial Disclaimer and Contact pages.
- Kept the annual workspace available alongside monthly and development analysis.

## 2.1 — Decision tools

- Added lease events, rate-cap/refinance boundaries, renovation prioritization, sales pacing and restricted deposits.
- Added break-even analysis, capital recovery, workbook cell references and prior-backup compatibility.

## 2.0 — Monthly expansion

- Added monthly unit events, expense/budget schedules, construction/refinance debt, investor allocation and entered tax scenarios.
- Added actuals, historical inputs, diligence, portfolio backups and seeded stress analysis.
- Fixed residual debt at development liquidation, historical-date validation and negative-reserve handling.

## 1.0 — Annual analysis

- Added annual underwriting, monthly debt schedules, sensitivity, CSV/XLSX rent-roll import, local snapshots, exports and printable reports.
- Added strict input/storage validation, worker file limits, formula-injection protection and static-host security headers.

Version history records feature changes. Current financial values and verification evidence live in METHODOLOGY.md and TESTING.md.
