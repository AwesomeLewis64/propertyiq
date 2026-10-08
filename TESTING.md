# PropertyIQ verification

Verification date: October 8, 2026. Release: 2.3.0.

## Results

| Check | Result |
|---|---|
| Regression tests | 184 pass across 10 files |
| Application and browser-test TypeScript | Pass |
| ESLint, including React hooks | Pass, zero warnings |
| Production build | Pass |
| Playwright | 18 pass: 9 desktop and 9 mobile |
| Serious/critical axe violations on checked screens | Zero |
| 390×844 page-level horizontal overflow | None on checked screens |
| Finance coverage | 91.31% statements, 83.62% branches, 100% functions, 92.36% lines |

Coverage gates apply to src/finance: 90% statements, lines and functions; 80% branches. Coverage is aggregated across that directory, not a claim of complete coverage of the monthly engine or interface.

## Independent financial verification

Literal expectations come from 40-digit Python Decimal calculations, not the functions under test. `scripts/decimal_benchmarks.py` reproduces the shared sample, payment conventions, debt balances, interest accrual and constraint capacities. The expected values are recorded in METHODOLOGY.md.

Regression cases cover operating income, reserves/CapEx inflation, tax reassessment, 3–10 year holds, both IO amortization conventions, calendar actual/360 including leap February, LTV/DSCR/debt-yield binding constraints, debt-free cases, maturity boundaries, IRR ambiguity, invalid inputs, imports and storage validation. Parity cases feed identical inputs to both engines and reconcile annual NOI, debt, equity, sale proceeds and annual cash-flow returns. Fixed management growth, rent-roll income and category expense rates are included.

## Browser verification

The production build runs under the actual public/_headers CSP through scripts/preview.mjs. The desktop viewport is 1440×900 and the mobile viewport is 390×844. Both use Chromium.

- Shared demo values, money edits, result changes, save/reset/load, report navigation and reload.
- CSV and XLSX upload, worker parsing and explicit application to annual analysis.
- Live extraction preview, editable default assumptions, formatted setup amounts and creation of Quick analysis.
- Eight primary monthly tools, all 19 tools through More tools, correct section headings, duplicate-project back/forward/reload and report deep links.
- Hash changes while mounted and legal routing with the public contact link.
- All monthly tools, all quick views, setup, home and four legal pages: serious/critical axe violations and page-width checks.
- Captured application errors are empty in demo and monthly-tool flows.
- Chromium print-media layout hides workspace navigation and print controls; its screenshot is saved. Native PDF pagination and physical printer output are not validated.

Screenshots are in docs/screenshots. CI uploads those screenshots, coverage, the HTML browser report and any failure traces. Screenshots demonstrate tested layouts; axe is an automated check rather than complete accessibility certification.

## Defects caught and fixed in this run

Currency focus could append typed values to the old amount in both setup and annual inputs. Delayed autosave could lose a newly duplicated project on immediate reload. Old mobile CSS hid navigation labels; sensitivity and status-header sizing could overflow the viewport. Report/setup/legal text lacked contrast, wide financial tables were not keyboard-focusable, and the unit-selector list role was invalid. These fixes remain covered by the browser suite.

## Repeat verification

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test:coverage
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

The GitHub workflow runs the same checks on each push and pull request. A successful local run does not claim that the workflow has already run remotely.

## Outstanding external validation

No real Walnut workbook was supplied. Follow RECONCILIATION.md and docs/reconciliation-template.csv to compare real metrics and classify differences before publishing an anonymized validation result. No public deployment has been created; response headers and imports on Cloudflare still need the DEPLOYMENT.md launch checks. Firefox, Safari, native PDF pagination and physical printers remain outside this verification scope.
