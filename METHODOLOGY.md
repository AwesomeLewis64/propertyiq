# PropertyIQ financial methodology

## Timeline and revenue

Year 0 is the acquisition equity outflow. Year 1 uses input annual income and expense assumptions. Subsequent years compound the relevant growth rate from Year 1, not from a pre-growth acquisition-year base. Sale occurs at the end of the selected whole-year hold, from 3 through 10 years. The model computes an additional forward year of NOI for valuation.

Manual stabilized residential rent = units × average monthly rent × 12. Vacancy, credit loss and concessions are separate additive percentages of this gross potential rent. Their combined total must be between zero and 100%. Annual other income = monthly other income × 12, and it grows independently. EGI = gross residential rent less those losses plus other income.

Current rent-roll performance uses only occupied contractual monthly rents × 12. Physical vacancy is already reflected by vacant units being excluded. Manual vacancy is not deducted in this mode and does not count toward the mode's combined-loss validation. Credit loss and concessions apply to occupied contractual rents. This mode holds occupancy implicit in the annual contractual base; it is not a future leasing forecast.

## Operating performance

NOI = EGI − annual operating expenses. Management is either a percentage of each year's EGI or an annual dollar expense compounded by expense growth. Taxes and insurance use their own growth rates; remaining expense categories and fixed management use the common expense growth rate. Legacy files without category rates inherit common expense growth. Reserves, capital spending, loan costs, debt service, depreciation, income taxes and amortization of debt are excluded from NOI.

Reserves = per-unit annual reserve allowance × units, compounded by entered inflation from Year 2. They are a cash outflow below NOI, without a terminal reserve-account release. Annual capital spending compounds at entered inflation and remains a separate below-NOI cash outflow. Initial CapEx is funded in Year 0 and is not deducted again in annual operating cash flow.

NOI margin = NOI / EGI. Operating expense ratio = operating expenses / EGI. Going-in cap rate = Year 1 NOI / acquisition price. Zero EGI makes related ratios unavailable.

## Debt

Loan = price × LTV, entered loan amount, or the minimum of LTV, DSCR and debt-yield limits. DSCR capacity uses Year 1 NOI / minimum DSCR / annual amortizing service per dollar (including actual/360 cash interest when selected), even during IO. Debt-yield capacity uses Year 1 NOI / minimum debt yield. The UI identifies the binding constraint; this is modeled capacity, not lender approval. Borrowing above acquisition price is unsupported. Origination fees are a percentage of loan proceeds and funded from equity at acquisition.

Monthly rate r = nominal annual interest / 12. With n amortization months, payment = P × r / [1 − (1+r)^−n]. For zero interest, payment = P / n. Monthly interest = opening balance × r. Principal = payment − interest, limited to outstanding principal. Closing balance = opening balance − principal. No currency rounding is applied internally, so display totals can differ by a few cents from lender schedules.

Interest-only periods charge interest with no scheduled principal. By default, the full original amortization term starts after IO. The selectable “IO consumes original term” convention recasts over original term minus IO months. Neither convention substitutes for loan documents.

30/360 uses annual rate / 12. Actual/360 uses actual calendar days in each modeled month, including leap years, divided by 360. Scheduled principal remains based on the nominal 30/360 amortization schedule; total cash payment varies by accrued interest. Full calendar months only; no stub periods, lender penny rounding, or lender-specific payment rules are inferred. See [Fannie Mae interest calculation guidance](https://mfguide.fanniemae.com/node/5436).

The schedule stops at the earliest of modeled sale, loan maturity or complete amortization. Fully amortized debt remains debt-free through sale. Annual regular debt service aggregates monthly principal and interest; it excludes a balloon repayment. Balloon due at contractual maturity is displayed separately. Sale payoff occurs after the exit year's final regular payment and is deducted from net sale proceeds exactly once.

If a remaining balance matures before exit, refinancing is required. The model suppresses maturity-year and later equity cash flows, net sale proceeds, IRR and equity multiple. It does not invent replacement debt. NOI remains available and the annual debt table discloses the balloon due.

DSCR = NOI / annual regular debt service, excluding balloon principal. Debt-free or zero-debt-service years show N/A. Debt yield = NOI / each year's opening loan balance. Year-end loan balance is after regular payments, before sale payoff or an unmodeled maturity payoff.

## Equity and sale

Initial equity = acquisition price + closing costs + initial CapEx + loan origination fees − initial loan proceeds. Year 0 equity cash flow is its negative.

Operating equity cash = NOI − regular debt service − reserves − annual CapEx. No extra subtraction of regular principal occurs because regular debt service already includes it.

Gross exit value = next year's NOI / effective exit cap rate. New analyses default to going-in cap plus 62.5 bps; manual rates remain editable. Compression produces a warning. Optional tax reassessment replaces forward tax with an entered effective rate times sale value: gross value = (forward NOI + original forward tax) / (exit cap + effective tax rate). This solves the circular valuation algebraically; it does not assert actual jurisdiction rules. Selling costs = gross exit value × selling cost percentage. Net sale proceeds = gross exit value − selling costs − outstanding loan balance after regular payments. The selected exit year's equity cash flow adds net sale proceeds exactly once. Cash flows after sale are unavailable; later annual operating values are explicitly reference values.

Nonpositive forward NOI makes capitalization-based sale and return metrics unavailable. The model does not characterize an investment as good or safe. Sale values and scenarios are hypothetical.

## Investment returns

Periodic annual IRR solves Σ CF[t] / (1+r)^t = 0, starting with Year 0. It is not a dated XIRR. The solver uses bisection on log(1+r), requires positive and negative cash flows, rejects more than one cash-flow sign change, and reports N/A when a meaningful supported root is not determined.

Total equity contributions = absolute sum of every negative equity cash flow, including additional annual funding. Distributions = sum of every positive equity cash flow. Equity multiple = distributions / contributions. An exit-year operating shortfall and sale receipt are netted at the same annual cash-flow date; intra-year funding is not modeled.

Year 1 cash-on-cash = Year 1 operating equity cash / initial equity. Average cash-on-cash = mean annual operating equity cash during the hold / initial equity. Both exclude sale proceeds.

Appreciation after selling costs = gross exit value − selling costs − purchase price. This excludes leverage, improvements and tax basis adjustments and is not a taxable capital gain calculation.

## Sensitivity and imports

IRR, DSCR, NOI and initial-equity sensitivity cells fully rerun the model. In LTV mode, changing price changes the loan amount. In manual loan mode, price changes retain the explicit loan amount; a loan exceeding purchase price invalidates that cell. Absolute closing costs and initial capital spending remain as entered in price scenarios. Rates use nominal annual interest. The terminal-value-only table varies forward NOI directly and applies the valuation identity; it does not fabricate financing or operating results for that independent NOI input.

Rent-roll required fields are unit ID, recognized occupied/vacant status and nonnegative occupied contractual rent. Units count one row per unit; duplicate unit IDs are flagged case-insensitively and never deleted automatically. Invalid or duplicate rows prevent application. Entire-property market potential and average market rent require a valid market rent on every row. Partial market data produces N/A. Physical occupancy = occupied units / total units. Annual contractual income includes only occupied units. Market gap = full annual market potential − annual occupied contractual rent, including both vacancy and loss-to-lease.

CSV parsing uses [Papa Parse](https://www.papaparse.com/docs). XLSX reading uses [read-excel-file](https://github.com/catamphetamine/read-excel-file), in a local worker. Neither formulas nor macros are executed. Cached formula values are not recalculated; users should save a recalculated workbook or use values-only spreadsheets.

## Independent benchmarks

Expected values are literals derived from an independent 40-digit Python Decimal implementation using closed-form payments, independently scheduled debt balances and a separate rate-domain root solver. The reproducible generator is scripts/decimal_benchmarks.py.

| Benchmark | Expected |
|---|---:|
| $500,000, 6%, 360 months: monthly payment | $2,997.75262576376197 |
| Balance after 12 payments | $493,859.94143861640561 |
| Balance after 60 payments | $465,271.78411409780075 |
| $1M, 6%, 24 IO months then 360 amortizing months | $5,995.50525152752395 |
| Same loan with IO consuming original term (336 months) | $6,151.24016636376617 |
| $1M at 6%, January actual/360 IO interest (31 days) | $5,166.66666666666667 |
| Same loan, 365-day calendar-year IO interest | $60,833.33333333333333 |
| DSCR loan limit at 3x coverage for shared sample | $1,180,198.9310385654 |
| Debt-yield loan limit at 30% for shared sample | $849,106.6666666667 |
| LTV loan limit at 20% for shared sample | $560,000 |
| Shared sample initial equity | $1,214,200 |
| Shared sample Year 1 NOI | $254,732 |
| Shared sample Year 5 NOI | $304,920.48843992 |
| Shared sample forward NOI | $318,862.3930272588 |
| Shared sample going-in cap | 9.09757142857143% |
| Shared sample exit cap | 9.72257142857143% |
| Shared sample final debt balance | $1,693,589.29417531599473 |
| Shared sample net sale proceeds | $1,504,030.13691440352392 |
| Shared sample annual levered IRR | 14.1693715686322317% |
| Shared sample equity multiple | 1.78032890021867724x |

The fictional value-add sample assumes $160,000 of initial capital, $1,900 monthly rent per unit and 4% annual rent growth as a simplified improvement plan. Expenses including management are 41.6509% of Year 1 EGI. Acquisition property taxes are assumed at 2% of purchase price; insurance is $24,000. These are illustrative assumptions, not a market comp or actual reassessment. No inputs or outputs are attributed to a real property.

## Agreement between engines

src/finance/sharedSample.ts maps one annual assumption set into the independently calculated monthly engine. Parity tests cover the shared sample, both IO conventions, actual/360, no debt, tax reassessment, constrained sizing, fixed management growth, rent-roll income, distinct expense growth and 10-year holds.

NOI, cash-flow annual roll-ups, exit debt balance and net sale proceeds agree within $0.000001 (no internal penny rounding). Annual IRR calculated from monthly annual roll-ups agrees within 1e-10. Dated monthly XIRR intentionally uses actual 365-day year timing and earlier monthly distributions; the tested cases differ from annual IRR by less than one percentage point. The interface labels the analysis and return convention, so annual IRR and monthly XIRR are never presented as interchangeable.

The shared sample uses annual growth steps, zero retained cash and monthly distribution of operating cash. Other monthly projects can use monthly compounding, cash retention, lease events, construction, actual overrides and refinancing, which have no direct annual equivalent. Monthly ledger netSale remains before financing payoff; saleNetProceeds separates sale-related payoff and fees from same-month refinancing. Annual net sale is after payoff. Neither reference sale series is added to total owner distributions.

## Chart conventions

The bridge reconciles operating income through NOI, scheduled debt service, reserves and capital costs. Scheduled debt service already contains principal. Sale, refinancing, balloon payoffs and owner distributions are excluded from this operating bridge. Monthly physical vacancy is reconstructed from modeled potential rent; recorded actual receipts are not reduced by forecast vacancy again.

Sensitivity changes one assumption at a time and reruns the existing calculation. Default shocks are ±10% rent/operating costs and ±0.5 percentage points vacancy/exit cap/interest; controls expose both magnitudes. Return differences are annual IRR or dated monthly XIRR percentage points, not relative percent changes. Actuals stay fixed; lease-event rents and loan reset rates follow the disclosed shocked inputs. Existing rate caps remain in force. Unsupported or invalid combinations remain N/A. Vacancy is not applied in the annual occupied rent-roll mode.

Recovery includes opening acquisition/as-of equity and subsequent owner calls. Annual positive operating cash and net sale receipts are separate; operating deficits increase contributions. Annual shortfall and exit receipts are netted on the same annual date for the return calculation, while the recovery view shows their sources separately.

Monthly owner distributions preserve the modeled dates and cash retention. The operating portion allocates retained operating surplus first, after operating deficits. This is a disclosed allocation convention, not segregated cash accounting: opening cash, refinancing and sales may also fund owner distributions. Net sale receipts are a separate cumulative reference after sale-related debt payoffs/fees; do not add this reference to total distributions. Nominal recovery does not account for time value of money, and opening equity in existing-property mode is an opportunity-cost input. No synthetic variation or forced return target is used.

## Workbook validation

Synthetic benchmarks and annual/monthly parity are verified. Reconciliation to a user's loan documents or real underwriting workbook is a separate comparison, not implied by the fictional sample. RECONCILIATION.md supplies mappings, tolerances and discrepancy records. The release bundles no private property data.
