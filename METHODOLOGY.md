# PropertyIQ financial methodology

## Timeline and revenue

Year 0 is the acquisition equity outflow. Year 1 uses input annual income and expense assumptions. Subsequent years compound the relevant growth rate from Year 1, not from a pre-growth acquisition-year base. Sale occurs at the end of Year 3, 4 or 5. The model computes an additional forward year of NOI for valuation.

Manual stabilized residential rent = units × average monthly rent × 12. Vacancy, credit loss and concessions are separate additive percentages of this gross potential rent. Their combined total must be between zero and 100%. Annual other income = monthly other income × 12, and it grows independently. EGI = gross residential rent less those losses plus other income.

Current rent-roll performance uses only occupied contractual monthly rents × 12. Physical vacancy is already reflected by vacant units being excluded. Manual vacancy is not deducted in this mode and does not count toward the mode's combined-loss validation. Credit loss and concessions apply to occupied contractual rents. This mode holds occupancy implicit in the annual contractual base; it is not a future leasing forecast.

## Operating performance

NOI = EGI − annual operating expenses. Management is either a percentage of each year's EGI or an annual dollar expense compounded by expense growth. Other expense categories grow at the common expense growth rate. Reserves, capital spending, loan costs, debt service, depreciation, income taxes and amortization of debt are excluded from NOI.

Reserves = per-unit annual reserve allowance × units, held constant. They are a cash outflow below NOI, without a terminal reserve-account release. Annual capital spending is a separate constant cash outflow. Initial CapEx is funded in Year 0 and is not deducted again in annual operating cash flow.

NOI margin = NOI / EGI. Operating expense ratio = operating expenses / EGI. Going-in cap rate = Year 1 NOI / acquisition price. Zero EGI makes related ratios unavailable.

## Debt

Loan = price × LTV, or the entered loan amount. Borrowing above acquisition price is unsupported. Origination fees are a percentage of loan proceeds and funded from equity at acquisition.

Monthly rate r = nominal annual interest / 12. With n amortization months, payment = P × r / [1 − (1+r)^−n]. For zero interest, payment = P / n. Monthly interest = opening balance × r. Principal = payment − interest, limited to outstanding principal. Closing balance = opening balance − principal. No currency rounding is applied internally, so display totals can differ by a few cents from lender schedules.

Interest-only months consume the original amortization term. They charge monthly interest without scheduled principal repayment. Afterward the opening principal recasts over the remaining original amortization months. This convention is explicitly disclosed and may differ from a particular loan agreement.

The schedule stops at the earliest of modeled sale, loan maturity or complete amortization. Fully amortized debt remains debt-free through sale. Annual regular debt service aggregates monthly principal and interest; it excludes a balloon repayment. Balloon due at contractual maturity is displayed separately. Sale payoff occurs after the exit year's final regular payment and is deducted from net sale proceeds exactly once.

If a remaining balance matures before exit, refinancing is required. The model suppresses maturity-year and later equity cash flows, net sale proceeds, IRR and equity multiple. It does not invent replacement debt. NOI remains available and the annual debt table discloses the balloon due.

DSCR = NOI / annual regular debt service, excluding balloon principal. Debt-free or zero-debt-service years show N/A. Debt yield = NOI / each year's opening loan balance. Year-end loan balance is after regular payments, before sale payoff or an unmodeled maturity payoff.

## Equity and sale

Initial equity = acquisition price + closing costs + initial CapEx + loan origination fees − initial loan proceeds. Year 0 equity cash flow is its negative.

Operating equity cash = NOI − regular debt service − reserves − annual CapEx. No extra subtraction of regular principal occurs because regular debt service already includes it.

Gross exit value = next year's NOI / exit cap rate. Selling costs = gross exit value × selling cost percentage. Net sale proceeds = gross exit value − selling costs − outstanding loan balance after regular payments. The selected exit year's equity cash flow adds net sale proceeds exactly once. Cash flows after sale are unavailable; later annual operating values are explicitly reference values.

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

Financial reference values were derived with 40-digit Python Decimal arithmetic using closed-form loan balances and an independent rate-domain bisection solver. They are literal expectations in the test suite, not outputs from the TypeScript implementation.

| Benchmark | Expected value |
|---|---:|
| $500,000 loan, nominal 6%, 360 months: monthly payment | $2,997.75262576376197 |
| Balance after 12 payments | $493,859.94143861640561 |
| Principal paid in Year 1 | $6,140.05856138359439 |
| Interest paid in Year 1 | $29,832.97294778154928 |
| Balance after 60 payments | $465,271.78411409780075 |
| $120,000 loan, 6%, 12 IO months then 108 amortizing months: recast payment | $1,440.68995571107103 |
| Microsoft IRR example (-70,000; 12,000; 15,000; 18,000; 21,000; 26,000) | 8.663094803653161% |
| Fictional demo initial equity | $1,134,200 |
| Fictional demo Year 1 NOI | $247,119 |
| Fictional demo Year 5 loan balance | $1,693,589.294175316 |
| Fictional demo net sale proceeds | $2,634,440.990040503 |
| Fictional demo levered IRR | 25.79549071435082% |
| Fictional demo equity multiple | 2.835137409921938x |

The periodic IRR example is from [Microsoft's IRR documentation](https://support.microsoft.com/en-us/excel/functions/irr-function?nochrome=true). Loan maturity and balloon concepts are consistent with the [CFPB explanation of balloon payments](https://www.consumerfinance.gov/ask-cfpb/what-is-a-balloon-payment-when-is-one-allowed-en-104/); those consumer-credit materials do not establish multifamily lending terms or legal requirements for this model.
