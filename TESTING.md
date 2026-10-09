# PropertyIQ verification

Verification date: October 9, 2026. Release: 2.4.0.

## Results

| Check | Result |
|---|---|
| Regression tests | 227 pass across 15 files |
| Application and browser-test TypeScript | Pass |
| ESLint, including React hooks | Pass, zero warnings |
| Production build | Pass |
| Browser checks | 121 pass across six desktop/narrow-screen projects; five PDF-only cases deliberately skipped |
| Serious/critical axe violations on checked screens | Zero |
| 390×844 page-level horizontal overflow | None on checked screens |
| Finance coverage | 91.31% statements, 83.23% branches, 100% functions, 92.36% lines |
| Actual PDF output | Chromium A4 landscape Quick brief and 120-month Monthly brief generated and visually inspected |

Coverage gates apply to src/finance: 90% statements, lines and functions; 80% branches. This is aggregated finance coverage, not complete monthly-engine or interface coverage.

## Financial verification

Literal expectations come from independent 40-digit Python Decimal calculations. scripts/decimal_benchmarks.py reproduces operating income, payments, debt balances and constraints; METHODOLOGY.md records expected values. The shared fictional sample retains 14.169371568632% annual IRR, $254,732 Year 1 NOI and $1,504,030.136914 net sale.

Existing regression cases cover income, inflation, reassessment, 3–10 year holds, IO and day-count conventions, loan constraints, maturity boundaries, IRR ambiguity, imports, validation and annual/monthly parity. Twenty-eight new cases cover bridge reconciliation, physical/economic vacancy, actual overrides, additional contributions, sale/refinance timing, operating-distribution allocation, percentage-point sensitivity, invalid/unsupported cases, provenance migration, safe CSV data and blank/zero/negative monetary parsing.

## Browser verification

The production build runs through scripts/preview.mjs under public/_headers CSP. Chromium, Firefox and Playwright WebKit run at 1440×900 and 390×844. Firefox uses a narrow viewport because mobile emulation is unavailable; Chromium and WebKit also enable mobile emulation. These are not physical-device or installed Safari checks.

- Quick inputs, formatted money, save/load/reset, reload, setup extraction/defaults and annual report.
- Annual and monthly CSV/XLSX import, explicit mapping/application and source retention.
- All 19 monthly tools, Decision Lab subtools, project switching, duplicate/back/forward/deep links, home and legal routes.
- Quick snapshots and portable restore; monthly backup/restore including actual evidence-file bytes, fresh IDs and rejection of missing attachments.
- Blank actuals, valid zero, signed historical flows, invalid monetary drafts and paused autosave.
- Example provenance after renaming, editing, duplication, reload and restore; cancelled destructive reset.
- Stale combined stress after editing controls, then successful recalculation.
- Keyboard chart inspection, hold-period alignment, actual PNG/SVG/CSV downloads, safe metadata and disclosed origin.
- Every monthly tool and checked Quick/setup/home/legal screen: zero serious/critical axe findings and no page-level overflow at 390 pixels. Tables remain scrollable and keyboard-focusable.
- Empty application-error collection in the checked sample and monthly navigation flows.
- Monthly planner entry with EasyList's `.adv-sidebar { display: none !important; }` cosmetic filter simulated, at 1920, 1440, 768 and 390 pixels in all six browser projects. Checks require visible navigation, correct main-content placement, readable headings and no horizontal page overflow. The test reproduced the reported collapse before the internal class was renamed to `planner-sidebar`.

Only Chromium desktop supports the actual page.pdf API used here. Its two PDFs are generated after report content, charts and fonts load. The other five project copies skip that PDF-only case while still testing all browser flows. Pages and exported PNGs are reviewed visually. Physical printers and native browser print dialogs are outside this scope.

Screenshots are in docs/screenshots; PDFs and portable chart samples are in docs/verification. CI publishes those artifacts, coverage, the browser report and failure traces. Axe is automated evidence, not complete accessibility certification.

## Defects caught and fixed

The previous round repaired currency focus, immediate duplicate autosave, routing, mobile navigation and contrast. This round also repaired WebKit File/Blob IndexedDB storage by retaining bytes with backward-compatible reads, incomplete attachment restore, blank actuals represented as zero, stale stress results, duplicated sale/refinance classification, SVG provenance metadata, chart text contrast and print page breaks/sidebar clipping. Meaningful regressions cover these financial and browser paths.

## Repeat verification

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test:coverage
pnpm build
pnpm exec playwright install chromium firefox webkit
pnpm test:e2e
```

The GitHub workflow repeats these checks on pushes and pull requests. Local success does not imply that remote CI has finished.

## External checks

The public site is https://propertyiq.pages.dev/. Cloudflare response headers, the production-origin sitemap and hosted imports were verified on October 8, 2026; DEPLOYMENT.md records the deployment settings and original hosted run. Real loan-document/workbook reconciliation uses RECONCILIATION.md; fictional benchmarks do not establish real-deal verification. No private test-property information is bundled.

## Design-system preview, October 8, 2026

The user approved publishing the navy-and-white update after reviewing the local preview. The production build, type checks, lint and all 212 calculation/regression tests passed. One complete browser run passed all 97 existing checks and six new delayed-import/error-recovery checks, with five intended PDF-only skips. The six new download-progress checks initially stopped at an ambiguous test locator; after making the locator specific, all six passed in a focused rerun. Final white surfaces, card shapes and matching page-heading styles were checked on Chromium desktop and mobile. The mobile heading check caught an old, more specific CSS selector, which was corrected; its focused rerun passed. The full suite was not repeated after these small corrections.

Quick and monthly report PDFs were generated and visually reviewed (seven and five pages respectively). Standalone PNG/SVG downloads work; SVG colors/fonts resolve from the shared design tokens. Reduced motion, busy-state error recovery, local backup/source preservation, existing navigation, accessibility and overflow were covered by the completed checks. The final preview screenshots and design-system notes are saved with the user-facing outputs. Production deployment is triggered by the approved push to main; the deployment result is recorded separately after Cloudflare finishes.
