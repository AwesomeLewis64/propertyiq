# BUILD REQUEST: PropertyIQ — Multifamily Real Estate Investment Analytics Platform

## 1. Your role and objective

Act as a senior full-stack software engineer, institutional real estate financial analyst, quantitative model reviewer, and UI/UX designer.

I want you to BUILD a fully functional, production-ready, responsive web application called **PropertyIQ**, a free multifamily real estate investment underwriting and analytics platform.

Do not just generate mockups, designs, pseudocode, or a development plan. Implement the actual application, working financial calculations, interactive features, charts, spreadsheet processing, testing, and deployment configuration.

The website should look and feel like a professional financial analysis tool appropriate for investment banking, real estate private equity, commercial real estate acquisitions, and small multifamily investment firms.

The application should allow users to analyze property acquisitions, model financing structures, forecast cash flows, perform sensitivity analyses, import rent rolls, and generate investor-friendly reports.

Prioritize financial accuracy, performance, clean design, user experience, and maintainable code.

**Critical constraints:**
- The application must be capable of operating at $0/month on a suitable free static hosting tier.
- No paid API, AI subscription, backend server, external financial data subscription, or database is required.
- No API keys or authentication are required for the initial release.
- All financial calculations and spreadsheet processing must run locally in the browser.
- Do not claim that deterministic financial calculations are generative AI.
- Users should be able to analyze actual properties without registering.
- Use fictional example property data for demonstrations.
- The application must be deployable publicly and suitable for a professional portfolio.

Build a complete working minimum viable product first. Only add advanced features after the core functionality passes automated and manual testing.

---

## 2. Recommended technical stack

Use the following stack unless there is a compelling technical reason not to:

**Frontend**
- React with TypeScript
- Vite
- Tailwind CSS
- Lucide icons
- Recharts for financial visualizations

**Financial calculations**
- Pure TypeScript functions, separate from UI components
- A robust, tested IRR calculation implementation
- Custom amortization calculations with explicit payment schedules
- Vitest for automated unit tests

**Data handling**
- PapaParse for CSV files, or an equivalent maintained parser
- A browser-compatible XLSX reader such as read-excel-file
- Client-side validation, normalization, and error handling
- Optional browser localStorage for saving analysis assumptions

**Reporting**
- Downloadable CSV tables
- Browser-based, professionally styled Print / Save as PDF report
- No paid PDF-generation service

**Hosting**
- Cloudflare Pages or an equivalent static hosting service
- GitHub repository compatible
- No required server-side functions

Avoid unnecessary dependencies. Use packages with suitable licensing and reasonable maintenance status.

Provide clear development instructions and exact deployment settings.

---

## 3. Visual design requirements

The interface must look like a polished commercial investment analytics platform.

Design direction: Bloomberg-inspired analytical seriousness combined with modern fintech design.

Use a clean light-mode interface by default.

Suggested colors:
- Background: off-white or very light gray
- Primary: dark navy
- Accent: professional blue
- Positive metrics: muted green
- Negative metrics: muted red
- Neutral metrics: gray

Typography should be modern, professional, and highly readable.

Use consistent spacing, subtle borders, restrained shadows, clean charts, and clear financial tables.

Avoid oversized decorative gradients, generic AI imagery, unnecessary animations, emojis, excessive rounded cards, and cluttered dashboards.

Formatting:
- Currency: $1,250,000
- Percentage: 7.25%
- Multiple: 1.85x
- Debt coverage: 1.42x
- Negative currency: ($25,000), or consistent equivalent
- Support comma-separated numbers and appropriate decimal precision

Support desktop, tablet, and mobile screens. Financial tables may scroll horizontally on smaller screens.

Provide tooltips explaining important investment metrics.

Include loading, empty, validation, and error states.

Meet basic accessibility requirements: appropriate labels, keyboard navigation, semantic HTML, and sufficient color contrast.

---

# 4. Website structure

Implement the following sections.

## A. Home / landing page

Create a professional landing page that immediately explains what the platform does.

Main headline:

**Institutional-Style Real Estate Analysis. Accessible to Everyone.**

Subheadline:

"Underwrite multifamily acquisitions, evaluate financing scenarios, forecast investment returns, and analyze operating performance — all in one free platform."

Buttons:
- Analyze a Property
- Explore Demo
- How It Works

Introduce the main capabilities using restrained, professional visuals.

Include a preview of the investment dashboard using actual working demo calculations.

Explain the metrics and assumptions the platform uses.

Do not include fabricated customer testimonials, performance statistics, company partnerships, or user counts.

Include footer links for:
- About
- Methodology
- Privacy
- Terms
- Financial Disclaimer

## B. Investment analysis dashboard

After selecting "Analyze a Property," users should enter an interactive investment workspace.

Layout:

**Left side**
- Input categories and editable investment assumptions

**Main content**
- Key financial metrics
- Interactive graphs
- Five-year cash flow table
- Investment return summaries
- Scenario analysis

Desktop should prioritize dense but readable analysis. Mobile should stack these sections logically.

Allow users to update assumptions and recalculate results instantly.

Use debounced updates where needed for responsiveness.

---

# 5. Multifamily acquisition underwriting

Create a comprehensive property input form with the following sections.

## Property information

Fields:
- Property name
- City and state (optional)
- Property type
- Number of residential units
- Acquisition price
- Property square footage (optional)
- Year built (optional)
- Acquisition date (optional)

Default example:
- Property: Maple Grove Apartments
- Units: 20
- Purchase price: $2,800,000

Clearly label this as fictional demonstration data.

## Rental income assumptions

Inputs:
- Average monthly rent per unit
- Number of units
- Other monthly income
- Economic vacancy percentage
- Credit loss percentage
- Concession percentage
- Annual rent growth percentage
- Annual other income growth percentage

Calculate:
- Gross potential residential rent
- Annual other income
- Vacancy loss
- Credit loss
- Concessions
- Effective gross income
- Effective gross income per unit

Define whether loss percentages apply to gross potential rental income or another revenue base. Be consistent and explain this in the methodology.

For manual underwriting, use:

Annual Gross Potential Residential Rent =
Units × Average Monthly Rent × 12

Effective Residential Rental Income =
Gross Potential Residential Rent × (1 − Vacancy Rate − Credit Loss Rate − Concession Rate)

Effective Gross Income =
Effective Residential Rental Income + Other Income

Validate that the combined loss assumptions are between 0% and 100%.

## Operating expenses

Allow annual dollar or percentage-based inputs where appropriate.

Fields:
- Property taxes
- Property insurance
- Repairs and maintenance
- Utilities
- Property management
- Payroll
- Administrative expenses
- Marketing
- Other operating expenses
- Annual operating expense growth percentage
- Replacement reserves per unit

Management expenses may be calculated as a percentage of effective gross income or entered as a fixed annual expense.

Clearly distinguish operating expenses from capital expenditures and debt service.

Calculate:

NOI = Effective Gross Income − Operating Expenses

Exclude depreciation, financing costs, income taxes, and capital expenditures from NOI.

Replacement reserves should appear as a separate below-NOI cash-flow deduction in the default model, with a clear methodology explanation.

Display:
- NOI
- NOI margin
- Operating expense ratio
- Operating expenses per unit
- Revenue per unit
- NOI per unit

---

# 6. Financing and debt modeling

This is a core feature and must be mathematically accurate.

Inputs:
- Loan-to-value ratio or manually entered loan amount
- Annual nominal interest rate
- Amortization term
- Loan maturity term
- Loan origination fees
- Acquisition closing costs
- Initial capital expenditure budget
- Optional interest-only period

The initial implementation may omit interest-only financing if necessary, but do not show the option until it works.

Calculate:
- Initial loan proceeds
- Initial equity requirement
- Monthly principal and interest payment
- Annual debt service
- Principal reduction
- Remaining loan balance by year
- Debt service coverage ratio
- Debt yield
- Loan-to-value ratio
- Cash flow after debt service

For a standard amortizing loan, use the mathematically correct monthly payment equation:

Payment = P × r / [1 − (1 + r)^(-n)]

Where:
- P = opening principal
- r = nominal annual interest rate / 12
- n = number of monthly payments over the amortization term

Handle zero-interest loans separately.

Create a monthly amortization schedule internally and aggregate the results into yearly debt service, interest, principal, and year-end balances.

Do not confuse amortization period with loan maturity.

When the modeled sale occurs before maturity, deduct the outstanding loan principal from sale proceeds.

If a loan matures before the modeled exit, flag the refinancing requirement instead of silently assuming the loan continues unchanged.

Calculate:

DSCR = NOI / Annual Debt Service

When no debt service exists, show "N/A" rather than infinity.

Calculate:

Debt Yield = NOI / Outstanding Loan Balance

Use consistent definitions and disclose whether the opening or closing loan balance is used.

---

# 7. Five-year investment projections

Create an interactive annual underwriting model with Year 0 through Year 5 cash flows.

Calculate an additional Year 6 NOI when necessary for terminal valuation.

Include:
- Residential rental income
- Other income
- Vacancy and collection losses
- Effective gross income
- Property taxes
- Insurance
- Utilities
- Repairs and maintenance
- Management fees
- Other operating expenses
- Net operating income
- Debt service
- Replacement reserves
- Capital expenditures
- Cash flow to equity
- Loan balance
- Estimated exit valuation
- Net sale proceeds

Allow the user to modify:
- Rent growth
- Other income growth
- Expense growth
- Exit capitalization rate
- Hold period, initially 3–5 years
- Exit selling costs
- Annual capital expenditures

Use a consistent convention for Year 1 assumptions. Year 1 should use the initial inputs; future years apply specified growth from the prior year.

If useful, allow different expense inflation assumptions for property taxes, insurance, and other expenses.

Calculate initial equity invested as:

Acquisition Price
+ Closing Costs
+ Initial Capital Expenditures
+ Loan Fees
− Initial Loan Proceeds

Model any initial funding sources explicitly to prevent double counting.

Year 0 equity cash flow should be negative initial equity invested.

Annual equity cash flow should include actual property cash flow after debt service, reserves, and annual capital expenditures.

At the exit year, add net sale proceeds to that year's operating cash flow.

**Terminal value:**

Gross Exit Value =
Forward 12-Month NOI / Exit Capitalization Rate

Net Sale Proceeds =
Gross Exit Value
− Selling Costs
− Outstanding Debt Balance

Clearly state that the exit valuation uses next year's projected NOI rather than the current year's NOI.

Calculate:
- Levered IRR
- Equity multiple
- Year 1 cash-on-cash return
- Average annual cash-on-cash return
- Total equity invested
- Total equity distributions
- Gross exit value
- Net sale proceeds
- Capital gain or loss, with the methodology clearly defined

Annual equity IRR should be calculated from the correct dated or equally spaced annual cash-flow sequence.

If using a periodic IRR implementation, do not mislabel it as XIRR.

Handle cases where an economically meaningful IRR cannot be determined.

Do not invent a result when the mathematical solver fails.

---

# 8. Investment dashboard and financial visualizations

Create a visually polished analytics dashboard.

Display these prominent metrics:

- Acquisition price
- Initial equity required
- Year 1 NOI
- Going-in cap rate
- Year 1 DSCR
- Year 1 cash-on-cash return
- Levered IRR
- Equity multiple

Include charts:

1. NOI by year — bar or line chart
2. Operating income versus expenses — stacked bar chart
3. Annual cash flow to equity — bar chart
4. Loan balance reduction — line chart
5. Property exit valuation versus equity proceeds — labeled comparison

All charts must update when inputs change.

Ensure chart values reconcile to the projection tables.

For negative values, appropriately distinguish losses from gains.

Include explanatory tooltips and a clear legend.

---

# 9. Interactive sensitivity analysis

This is one of the most important features for differentiating the platform.

Create interactive sensitivity tables for:

**A. Exit capitalization rate vs. rent growth**
- Show levered IRR

**B. Interest rate vs. acquisition price**
- Show initial equity requirements and DSCR, with an option to switch the displayed metric

**C. Vacancy vs. operating expense growth**
- Show projected NOI or IRR

**D. Exit cap rate vs. sale-year NOI**
- Show estimated exit value

Highlight more favorable and less favorable results with a restrained heatmap.

All cells must be derived from full scenario recalculations when the metric depends on financing or cash flows.

Do not simply multiply the base-case IRR or make mathematically invalid approximations.

Allow users to select a scenario cell to see the corresponding assumptions and metrics.

Include:
- Base case
- Upside case
- Downside case

Let users customize those scenarios and compare them side by side.

Explain that scenarios are hypothetical, not forecasts or investment recommendations.

---

# 10. Rent roll CSV/XLSX import

Implement a functioning spreadsheet upload feature.

Supported:
- CSV
- XLSX

Process files entirely in the browser.

Do not upload files to any server.

Support common columns:
- Unit identifier
- Occupancy status
- Monthly contract rent
- Market rent, when available
- Lease expiration date, when available

Do not require tenant names, personal contact details, or sensitive financial information.

Include a column-mapping interface so users can identify fields when column names differ.

Validate missing or invalid values and clearly show rejected rows.

Detect obvious duplicates without automatically deleting them.

Calculate:
- Total units
- Occupied units
- Vacant units
- Physical occupancy
- Total occupied contractual rent
- Annualized occupied contractual rent
- Average occupied-unit rent
- Average market rent, when provided
- Annualized market potential rent, when provided
- Difference between current scheduled rents and market rent potential

Important: Do not double-count vacancy.

When importing a rent roll, occupied contractual rent must not also be reduced by the same physical vacancy rate already reflected by vacant units.

Use clearly separated calculation modes for:
1. Manual stabilized underwriting
2. Current rent-roll performance

Do not silently change the user's existing underwriting assumptions after an upload.

Offer an explicit "Apply Rent Roll to Analysis" control.

If the data cannot establish a valid metric, display "N/A" and explain why.

Apply reasonable file-size and row-count limits and handle malformed files gracefully.

---

# 11. Investment analysis report generation

Create a professional print-ready investment report.

Users should be able to download a PDF through browser print-to-PDF.

The report should include:

**Executive overview**
- Property name and key assumptions
- Purchase price
- Initial equity
- Unit count
- Key investment metrics

**Operating performance**
- Revenue and expense breakdown
- NOI analysis
- Operating assumptions

**Financing**
- Loan terms
- Annual debt service
- DSCR
- Loan repayment and exit balance

**Investment return projections**
- Five-year cash flow table
- IRR and equity multiple
- Exit valuation

**Sensitivity analysis**
- Selected scenario comparison
- Base, upside, and downside outcomes

**Methodology and limitations**
- Definitions of important metrics
- Assumptions
- Calculation conventions
- Report generation date

The report should have professional typography, consistent table formatting, and page breaks.

Do not include imaginary analyst endorsements, fake firm names, or unverified data.

Provide CSV exports for the annual projections and debt schedule.

---

# 12. Automated financial insights (without a paid AI API)

Create an "Investment Insights" section powered by transparent, deterministic financial rules.

Do not call this a generative AI assistant.

Possible insights:
- "Year 1 DSCR is below 1.25x."
- "Operating expenses represent 44% of effective gross income."
- "The modeled IRR declines materially when the exit capitalization rate increases."
- "Debt service consumes a large portion of projected NOI."
- "The downside case produces negative annual equity cash flow."

Insights should be generated from actual calculated values.

No hardcoded results.

Every insight must be linked to its corresponding metric, assumption, and financial implication.

Do not automatically characterize an investment as good, safe, guaranteed, or worth purchasing.

Label this feature "Automated Investment Insights."

A future optional generative AI integration may be considered later, but do not implement a paid external API in version one.

---

# 13. Financial accuracy and quality assurance

This requirement is non-negotiable.

Separate all financial logic from the frontend UI.

Create reusable, documented calculation functions.

Use robust numeric validation.

Handle:
- Zero interest rates
- No leverage
- Negative NOI
- High vacancy
- Invalid exit cap rates
- Zero initial equity
- Excessively high leverage
- Negative cash flows
- Empty uploads
- Missing rental data
- Invalid financing terms
- Negative or nonsensical user inputs

Never display NaN, Infinity, undefined, or misleading financial results.

Create automated unit tests for:
- NOI
- Effective gross income
- Cap rate
- DSCR
- Monthly loan payment
- Principal and interest allocation
- Remaining loan balance
- Cash-on-cash return
- Equity multiple
- IRR
- Exit valuation
- Net sale proceeds
- Scenario recalculation
- Rent roll aggregation

Include independently verifiable test cases.

At minimum:

Test A:
Purchase price = $1,000,000
Annual NOI = $100,000
No financing

Expected going-in cap rate = 10.00%.

Test B:
Loan amount = $0
Annual NOI = $100,000

Expected DSCR = N/A.

Test C:
Annual rent potential = $120,000
Vacancy = 5%
Credit loss = 0%
Concessions = 0%
Other income = $0

Expected effective gross income = $114,000.

Test D:
Year 6 projected NOI = $150,000
Exit cap rate = 6%

Expected gross exit value = $2,500,000.

Test E:
Purchase price = $1,000,000
Closing costs = $20,000
Initial CapEx = $50,000
Loan fees = $10,000
Loan proceeds = $700,000

Expected initial equity = $380,000.

Test additional cases for a 6% amortizing mortgage, annual debt schedule, and a known IRR cash-flow sequence.

Compare complex calculations with independently derived expected outputs, not values generated by the same function being tested.

Explicitly verify that debt principal is not counted twice, vacancy is not counted twice, and exit proceeds are included exactly once.

If tests fail, fix the implementation and rerun them.

Do not claim tests have passed unless they were actually executed.

---

# 14. User experience and functionality

The application must be usable by somebody who understands real estate but has no software development background.

Include:
- Clear navigation
- Editable assumptions
- Useful default values
- Reset to Demo
- New Analysis
- Save Analysis Locally
- Load Saved Analysis
- Export Report
- Export Data
- Contextual help
- Input validation and useful error messages

Saved analyses should use browser storage where appropriate. Users must be able to delete saved data.

Provide a clearly written explanation that browser storage is local to the device/browser and may disappear if browser data is cleared.

Make the dashboard interactive rather than a static demonstration.

Do not require account creation.

Do not collect tenant names or personal information.

Do not implement analytics tracking, advertising scripts, or third-party cookies in the initial MVP.

---

# 15. Performance, security, and privacy

Optimize for fast load times.

Lazy-load larger functionality where practical, particularly spreadsheet parsing and reporting components.

Prevent spreadsheet imports from freezing the interface.

Avoid unsafe HTML injection, arbitrary code execution, and unnecessary external network requests.

Never expose API secrets because the frontend must operate without any.

All spreadsheet data should remain local.

Do not send financial assumptions or uploaded documents to an external server.

Clearly disclose this privacy behavior.

Follow basic security practices for public web applications.

---

# 16. SEO and future monetization

Although this project is initially free and primarily intended as a professional portfolio project, design it to support future organic traffic and advertising.

Include:
- Unique page titles
- Meta descriptions
- Semantic headings
- Descriptive URLs where appropriate
- Mobile-friendly pages
- Sitemap
- Robots.txt
- Accessible page structure

Create useful educational explanations of:
- How to calculate cap rate
- Understanding DSCR
- How real estate IRR works
- Cash-on-cash returns
- Real estate sensitivity analysis

These explanations must be technically accurate and original, not generic AI-generated filler.

Do not add advertisements now.

Keep the layout capable of supporting restrained ad placements later without interfering with the financial tools.

---

# 17. Deployment and documentation

The finished product should deploy as a static website.

Use an appropriate build process compatible with Cloudflare Pages.

Provide:
- Complete source code
- Package.json and dependency definitions
- Project directory structure
- TypeScript configuration
- Build configuration
- Test configuration
- README.md
- Financial methodology documentation
- Installation and development instructions
- Production build instructions
- Cloudflare Pages deployment instructions
- Known limitations

The site must not require users to obtain paid API keys.

Use a free hosted subdomain until a custom domain is needed.

---

# 18. Development sequence

Follow this order:

**Phase 1 — Working core**
1. Set up the React/TypeScript application.
2. Create the responsive landing page and investment workspace.
3. Implement property and operating assumptions.
4. Implement acquisition financing and annual debt calculations.
5. Implement accurate five-year investment projections.
6. Display investment metrics and charts.
7. Run foundational financial calculation tests.

**Phase 2 — Advanced analysis**
1. Implement sensitivity analysis.
2. Implement scenario comparisons.
3. Build the detailed projection tables.
4. Add downloadable reports.
5. Implement financial insights.

**Phase 3 — Spreadsheet functionality**
1. Build CSV and XLSX import.
2. Implement column mapping.
3. Implement vacancy-safe aggregation.
4. Connect valid rent-roll data to underwriting assumptions.
5. Test uploads with multiple sample files.

**Phase 4 — Production hardening**
1. Test desktop and mobile interfaces.
2. Validate calculations against independent benchmarks.
3. Resolve TypeScript and build errors.
4. Improve accessibility.
5. Check privacy and performance.
6. Write deployment documentation.
7. Prepare for a public launch.

Do not skip unfinished foundational phases to add decorative features.

---

# 19. Definition of done

The project is complete only when:

- A user can open the website without logging in.
- A user can enter property and financing assumptions.
- The model produces accurate and explainable financial results.
- Editing assumptions changes all relevant metrics and charts.
- Debt schedules and equity cash flows reconcile.
- IRR and equity multiples use the appropriate cash flows.
- Sensitivity tables recalculate correctly.
- A user can import a real CSV/XLSX rent roll without uploading it to a server.
- A user can export a useful investment report.
- The application works on desktop and mobile.
- Automated tests execute successfully.
- The production build completes successfully.
- The website can be deployed to a free static hosting service.
- It does not require API keys or paid services.
- There are no fake data claims or nonfunctional demonstration controls.

If an advanced feature cannot be implemented correctly, exclude or explicitly mark it as unavailable rather than ship misleading calculations.

## Final instruction

Build the actual application.

Start by setting up the project, defining the financial calculation architecture, and implementing Phase 1. Continue through the phases in the stated order, validating each before moving on.

Take responsibility for producing clean, working, production-quality code rather than a visually attractive but financially unreliable prototype.

At the end, provide a concise implementation summary, file structure, testing results, known limitations, and exact deployment steps.

Do not claim the website is deployed until you have actually deployed it and confirmed that it works.
