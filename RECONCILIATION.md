# Workbook reconciliation

Use this checklist to compare your own workbook with PropertyIQ. The bundled example is fictional; a real-deal reconciliation claim requires a completed, documented comparison.

1. Make an anonymized, values-only copy of the workbook. Remove tenant identifiers, names, addresses and account details. Recalculate and save in Excel first: PropertyIQ reads cached values and does not run formulas or macros.
2. Open Monthly planner → More tools → Workbook reconciliation. Create a separate project and enter the workbook's assumptions, forecast date, hold, cash-retention policy and financing conventions.
3. Match unit rents and occupancy, vacancy/collection-loss treatment, expense categories and growth, management basis, reserves, capital dates, loan amount/rate/IO/amortization/accrual/maturity, fees, sale cap and costs.
4. Choose the comparison period (normally months 1–12). Upload the anonymized workbook, select its sheet, then map each metric by its actual cell address. The addresses below must come from your workbook; none has been guessed.
5. Record the workbook version, sheet, exact cell, period, definition and sign convention for every map. Use one cell per metric, or a separate values-only summary sheet with supported metric labels in one column and values in another.

| Workbook cell to locate | PropertyIQ metric / check | Definition to match |
|---|---|---|
| Year 1 total net operating income | Period NOI | EGI less operating expenses; before financing, reserves and CapEx |
| Year 1 regular principal + interest payments | Period scheduled debt service | Exclude balloon, refinance payoff and origination fees |
| Year 1 DSCR formula output | Period NOI DSCR | Same period NOI divided by regular debt service; use NOI rather than lender NCF unless workbook conventions are adjusted |
| Closing sources-and-uses equity | Initial / as-of equity | Price + closing + initial capital + cash reserve + fees − initial debt; existing-property mode uses entered as-of equity |
| Total later owner cash contributions | Additional owner capital calls | Sum of positive capital calls, separate from distributions |
| Levered dated return output | Forecast dated XIRR | Same dates and equity cash flows; annual IRR is a convention difference |
| Total distributions / total contributions | Equity multiple | Include later equity calls; separate terminal operating shortfalls from sale distributions |
| Terminal gross property sale value | Gross rental exit value | Forward 12-month NOI / cap, before selling costs and debt payoff |
| Terminal NOI subtotal | Manual export cross-check | Next 12 months after exit; compare growth and tax assumptions |
| Final regular-payment loan balance | Monthly debt export cross-check | Balance before disposition payoff; include IO convention and interest day count |
| Terminal net sale equity receipt | Monthly cash export cross-check | Gross sale − selling costs − final balance − payoff penalty; monthly row netSale is before financing payoff |
| NPV at stated hurdle | Forecast NPV | Same dated flows and required return |

Use docs/reconciliation-template.csv for the mapping and discrepancy record. Blank values are intentional. The app does not currently expose forward NOI, final pre-payoff balance or net sale as independent reconciliation metric choices; use exported debt and cash tables for those cross-checks.

Tolerances should reflect the workbook's rounding policy, not hide errors:

- Operating totals and initial equity: within $1 after matching periods and dollar rounding.
- Debt payments and balances: within $1 for unrounded schedules; if a lender rounds each month, reconcile the monthly schedule and explain accumulated pennies rather than expanding tolerance blindly.
- DSCR and equity multiple: within 0.005x when both sources display two decimal places; compare full precision if available.
- IRR/XIRR: within 0.01 percentage points only when dates and distribution timing match. Annual vs monthly returns require a documented convention bridge.
- Gross/net exit: within $1 once forward NOI, cap, costs and financing match.

For every discrepancy, record: source file/version → Sheet!Cell → metric and period → workbook value → PropertyIQ value → absolute/relative delta → tolerance → classification → cause → fix/bridge → retest result → reviewer/date. Classifications: convention difference, input mismatch, rounding, stale workbook cache, unsupported feature, or software bug.

A convention difference must have a reproducible bridge. A bug must be fixed and covered by a regression test; do not label it a convention merely because two outputs differ.

After all mappings pass, publish only an anonymized summary: number of metrics checked, periods, tolerances, unresolved differences, date and reviewer. Keep actual deal figures private. Synthetic test results alone do not imply a real-workbook comparison.
