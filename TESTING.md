# PropertyIQ verification

**Legal-page update, October 8, 2026:** TypeScript checking and the production build pass. Focused browser checks cover all four footer links, completed privacy sections, pending Contact details, returning to the start page with an unfinished description preserved, and legal access from the monthly and annual workspaces. A visual check covers the legal document layout. No financial regression suite was rerun; the financial engines are unchanged.

**Latest interface update, 2.2 beta:** four focused checks in `src/ui/startFlow.test.ts` pass: local extraction of the supplied description; labeled annual amounts/financing; setup without fictional renovations, budgets or tax basis; sample/report income consistency. TypeScript checking and the production build pass. A brief browser review covers the start page, editable review, sample report/grouped navigation and phone-width start page. This supersedes the latest-run claim below; earlier checks are historical. No full financial regression or printing was performed. See [UI_REDESIGN.md](UI_REDESIGN.md).

**Latest update, 2.1 beta:** six focused cases in `src/advanced/decisionTools.test.ts` pass, as do TypeScript checking and the production build. They cover multiple lease events; cap expiry and delayed refinance boundaries; renovation ranking, positive hold-period incremental cash and spending limits; sales pacing and restricted deposits; recurring break-even and nominal capital recovery; stored spreadsheet values/address parsing and prior-backup compatibility. The browser smoke check is intentionally brief. The earlier hundred-test suite was not rerun, following the user's requested scope. See [DECISION_TOOLS.md](DECISION_TOOLS.md).

**Previous monthly-expansion regression run (historical):** 100 tests passed across 6 files: the 60 original annual-release tests below and 40 expansion cases in `src/advanced/advanced.test.ts`. Expansion checks covered monthly unit events and cash conservation; fixed/IO/floating/construction/refinance/maturity debt; residual development liquidation debt; minimum DSCR/LTV/yield sizing; historical/actual inputs; waterfall cash conservation; entered tax assumptions; dated returns; imports and schema rejection; seeded risk and excluded trials. Three initial failures exposed unpaid residual development debt at final liquidation, impossible historical dates and negative reserves. Those bugs were fixed and that suite rerun successfully. These results are not a fresh regression run of 2.1. Real Walnut workbook reconciliation remains outstanding.

**Scope of the original evidence below:** the independent benchmarks, phase gates and original browser verification refer to the annual release. They do not establish that all new monthly/development outputs are correct.

This release was built in four phases. Each phase passed its tests and production build before implementation expanded. The final regression run passed **60 tests across 5 files**, TypeScript checking, and the Vite production build. A final production dependency audit reported **no known vulnerabilities** after updating fflate to 0.8.3.

## Phase gates

| Phase | Completed scope | Passing tests at gate |
|---|---|---:|
| 1 | Five-year operating projections, monthly debt, returns, input validation | 20 |
| 2 | Four sensitivity matrices, editable scenarios, deterministic insights | 31 |
| 3 | CSV/XLSX mapping, validation, occupied-rent aggregation and explicit application | 48 |
| 4 | Local snapshots, exports, report, responsive UI and final regression cases | 60 |

## Independent financial checks

Expected mortgage, demo and IRR values were calculated separately using 40-digit Python Decimal arithmetic, the closed-form mortgage equation, and an independent IRR root solver. Tests use literal expected values, rather than obtaining expected results from the model under test.

| Benchmark | Expected result |
|---|---:|
| $500,000, 6%, 30-year monthly payment | $2,997.752625763762 |
| Same loan, Year 1 ending principal | $493,859.9414386164 |
| Same loan, month 60 ending principal | $465,271.7841140978 |
| $120,000, 6%, 12 IO months, then 108 amortizing months | $1,440.689955711071 payment after IO |
| Annual IRR of −70,000; 12,000; 15,000; 18,000; 21,000; 26,000 | 8.663094803653161% |
| Fictional demo Year 1 NOI | $247,119 |
| Fictional demo Year 6 forward NOI | $288,535.3522810546 |
| Fictional demo Year 5 ending debt | $1,693,589.294175316 |
| Fictional demo net sale proceeds | $2,634,440.990040503 |
| Fictional demo annual levered IRR | 25.79549071435082% |
| Fictional demo equity multiple | 2.835137409921938x |

Regression coverage includes zero-interest and unlevered cases; full amortization; IO recasting; monthly-to-annual reconciliation; sale at maturity; maturity before sale; three-year sale; additional equity contributions in negative operating years; nonpositive exit NOI; ambiguous IRR signs; and numerical overflow. Sensitivity centers reconcile to the base case and terminal valuation follows forward NOI divided by cap rate.

Import tests cover aliases and manual mapping requirements, quoted currency, BOM headers, blank records, vacant units, missing market rents, invalid statuses/dates/amounts, duplicate units, malformed CSV/XLSX, and row/column limits. The actual XLSX reader processes the multi-sheet fixture. Saved snapshots have versioned schema validation and are protected against malformed existing storage. CSV exports have consistent columns and protect text cells against spreadsheet formula injection.

## Browser verification

The final app was checked in the Codex in-app browser using the production preview. Checks included:

- Editable assumptions update results; invalid loss rates suppress the model. Negative growth remains editable and recalculates correctly.
- Zero-interest financing, optional IO, and debt maturity before exit show the expected results and unavailable-return explanations.
- Heatmap selection and custom operating scenarios recalculate; customized scenarios appear in reports and saved analyses.
- CSV and XLSX uploads show the expected 10 units, 8 occupied units, 80% occupancy and $12,200 monthly occupied rent. Uploading alone preserves current assumptions; explicit application updates them. Physical vacancy is not deducted twice.
- XLSX worksheet selection is available. Invalid and duplicate rows prevent application.
- Saving, changing assumptions, loading, and deleting a QA snapshot restore the intended values. A new analysis retains access to import and methodology while inputs are incomplete.
- Downloaded annual and monthly CSV files were read independently: 7 projection rows including the header and Year 0; 61 debt rows including the header; expected initial equity and terminal debt/sale values.
- A 390-by-844 mobile viewport has no page-level horizontal overflow. Wide tables scroll inside their panels. Desktop and mobile screenshots are included with the deliverables.
- Keyboard navigation exposes the skip link. The final dashboard produced no captured console errors or warnings.

## Verification limits

The report was verified on screen. Printing was stopped at the user's request; native PDF output and printer layout were not verified. No public deployment was performed. Cloudflare response headers and deployment-specific behavior must be checked after hosting. The browser checks are targeted regression checks, not certification across every browser or device.

Passing tests do not guarantee the absence of all defects. The financial conventions and unsupported financing structures are documented in METHODOLOGY.md and README.md.

## Expansion browser checks

The production expansion was checked separately with fictional data:

- All 12 workspace sections open, including monthly cash/debt tables, expense/budget editors, investors, diligence and portfolio.
- The eight-sheet sample XLSX loads through the parsing worker. Mapping units and monthly actuals requires explicit application; 3 units and 2 actual periods appear after application. Applied source files are attached to diligence.
- Combined stress and the risk worker produce results; the fictional baseline simulation reports 150 complete trials with no excluded trials.
- Named revisions save. Complete JSON backups include source files; restoring creates new project copies. A second backup contains the restored files with distinct IDs. QA projects were archived into recoverable revisions after checks.
- Reloading the monthly deep link preserves saved inputs. Monthly and debt CSV exports each contain 61 lines including headers; investment notes contain nonempty Markdown.
- The overview at a 390-by-844 viewport has no document-level horizontal overflow. Desktop and mobile screenshots are included. The final captured console has no warnings/errors.

These are targeted workflow checks, not exhaustive browser/device coverage. No real Walnut records were imported, and no printing was performed.

## Decision-tools browser smoke check (2.1)

The final production preview opens the new sidebar and three-column Base/Downside/Upside comparison. The Walnut template shows all acquisition, actual and forecast numbers as **Not supplied**. The fictional comparison CSV parses through the worker; column mapping previews all nine supported metrics with the correct source addresses and converts `20%` to a decimal XIRR benchmark. The sample was previewed without saving its benchmarks into the user's project. No complete end-to-end check of every new screen, second full regression suite, real Walnut reconciliation or printing was performed.

## Repeat checks

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm audit --prod
pnpm preview
```

Use the fictional files in public/samples to check import behavior without supplying private property records.
