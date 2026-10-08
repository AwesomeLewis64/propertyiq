# PropertyIQ review implementation

Release 2.3.0 implements the local code, design, finance, testing and documentation work from both reviews, preserving the navy/serif visual style and all existing tools. Contact is abc@gmail.com.

| Feedback | Result |
|---|---|
| Unrealistic demo and conflicting samples | One shared fictional value-add case; 14.17% annual IRR, 14.81% dated monthly XIRR, 41.65% operating expense ratio, 2% purchase-price tax allowance, 62.5 bps cap expansion |
| Debt conventions and sizing | Full amortization after IO default, explicit original-term option, actual/360 calendar interest and minimum-of-LTV/DSCR/yield sizing |
| Expense/exit model limitations | Tax and insurance growth, other expense growth, reserve/CapEx inflation, optional sale-tax reassessment, 3–10 year holds |
| Engine trust | Shared inputs with independent calculations and parity tests; intentional timing differences labeled |
| First-run honesty | Paste deal details copy, examples, live understood-figure preview, 31 phrasing tests, visible/editable defaults |
| Hidden annual model | Quick analysis first with a mode explanation; sample opens its annual overview |
| Wayfinding | Section h1/project subtitle, compact sticky project header, eight primary tools, More tools/search/scroll cue, Decision Lab tabs, report-action/title cleanup |
| Results readability | Formatted money fields, eight consistent monthly headline metrics, separated trace links, legends/dashed series, axes and liquidation annotation |
| Sensitivity bias | Going-in cap and +100 bps anchors, user target return, diverging scale, base marker, aligned headers and takeaway |
| Mobile | Sticky quick summary, assumptions accordion, labeled tabs, usable controls and width constraints |
| Routing/storage | Live hash listener; project id and section in URL; exact back/forward/reload; immediate valid autosave |
| Accessibility | Minimum 12px text tokens, 13px captions, contrast fixes, focusable table scrolling and valid unit-selector semantics |
| Engineering safeguards | CI, ESLint/hooks rules, typechecks, finance coverage gates and 18 Playwright tests with axe/screenshots |
| Launch documentation | Short README with three screenshots, concise changelog, methodology, deployment steps and reconciliation checklist/template |

## Structure before and after

| File/module | Before | After |
|---|---:|---:|
| AdvancedWorkspace.tsx | 1,012 | 728 |
| engine.ts | 1,054 | 569 |
| Focused engine operations/validation/partner modules | — | 184 / 332 / 65 |
| WorkspaceResults.tsx | — | 455 |
| Stylesheets | 3 files, 4,112 lines | 1 file, 4,421 lines |

The main files became smaller by moving focused responsibilities into modules. The combined stylesheet grew with the requested accessibility, navigation and mobile rules; it is not presented as a line-count reduction. Shared design tokens centralize key colors, sizes and captions. Cleanup removed 50 redundant or overridden declarations/rules, and the obsolete mobile zero-font-size declarations were removed.

## Verification and remaining work

184 regression tests, strict types, lint, production build and 18 desktop/mobile browser tests pass. TESTING.md records scope and coverage.

Actual Walnut reconciliation needs the workbook and source-cell mapping. Public launch needs a Cloudflare Pages deployment and its real SITE_URL. Neither a real-deal result nor a live URL has been invented. The GitHub Actions workflow repeats verification on each push and pull request; its remote results are available in the repository Actions tab.
