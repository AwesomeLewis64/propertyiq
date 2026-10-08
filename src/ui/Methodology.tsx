export default function Methodology() {
  return (
    <section className="panel prose">
      <span className="eyebrow">MODEL CONVENTIONS</span>
      <h2>Know what is behind the numbers.</h2>
      <p>
        PropertyIQ uses deterministic calculations. There is no AI API,
        financial data feed, account requirement or server-side calculation.
      </p>
      <h3>Income and operating performance</h3>
      <p>
        Year 1 uses your initial assumptions. Growth starts in Year 2. Manual
        rent potential is units × monthly rent × 12. Vacancy, credit loss and
        concessions each apply to gross residential rent; other income is not
        reduced by these percentages. Management fees use EGI, or a fixed annual
        amount that grows with expenses.
      </p>
      <p>
        NOI is effective gross income less operating expenses. Reserves, CapEx,
        depreciation, income taxes and financing costs are excluded from NOI.
        Reserves are a constant annual per-unit allowance and are treated as a
        below-NOI cash outflow; no reserve-account release is modeled. Annual
        CapEx is a separate constant annual amount. There is no double deduction
        of loan principal.
      </p>
      <h3>Debt and coverage</h3>
      <p>
        Monthly interest uses nominal annual rate ÷ 12. Payments amortize
        monthly; no lender penny-rounding is applied internally. Zero-interest
        loans divide principal evenly. Interest-only months count toward the
        original amortization term, then the balance recasts over the remaining
        months. Maturity and amortization are separate. Refinancing is not
        modeled; when a remaining loan matures before exit, incomplete
        investment returns are suppressed.
      </p>
      <p>
        DSCR = NOI ÷ annual regular debt service; a debt-free year displays N/A.
        Debt yield = NOI ÷ opening annual loan balance. Loan payoff is deducted
        once from exit proceeds after the final regular payment.
      </p>
      <h3>Sale and investment returns</h3>
      <p>
        Exit value = next year's NOI ÷ exit cap rate. Selling costs are a
        percentage of gross exit value. Sale occurs after the selected year's
        operating cash flow. Year 0 is negative initial equity: price + closing
        costs + initial CapEx + loan fees − loan proceeds.
      </p>
      <p>
        Levered IRR uses equally spaced annual equity cash flows; it is periodic
        IRR, not XIRR. Multiple sign changes can produce ambiguous roots and
        display N/A. Equity multiple divides all positive distributions by all
        negative contributions, including negative annual equity cash flows.
        Cash-on-cash uses operating cash after debt, reserves and CapEx divided
        by initial equity and excludes sale proceeds.
      </p>
      <p>
        Property appreciation after selling costs is gross exit value less
        selling costs less acquisition price; it excludes debt, capital
        improvements and tax basis adjustments, and is not a taxable capital
        gain calculation. Nonpositive forward NOI invalidates
        capitalization-based return calculations.
      </p>
      <h3>Rent-roll performance</h3>
      <p>
        Current rent-roll mode uses occupied contractual rent, so physical
        vacancy is already reflected and is not deducted again. Credit loss and
        concessions still apply to occupied contractual rents. Uploading a file
        does not apply it automatically. Invalid rows and duplicates require
        resolution before application. Market potential requires valid market
        rents for every unit.
      </p>
      <h3>Privacy, terms and limitations</h3>
      <p>
        Files and assumptions are processed in this browser. Saved analyses use
        this browser's local storage and can disappear when browser data is
        cleared. No analytics tracking, ads or third-party cookies are included.
        You control file uploads and local saving. Hosting providers receive
        ordinary website requests; uploaded rent rolls and assumptions are not
        transmitted by PropertyIQ.
      </p>
      <p>
        This free educational tool provides hypothetical pre-tax scenarios, not
        investment, legal, tax or lending advice. Results depend on your
        assumptions. It excludes refinancing, changing interest rates, complex
        waterfalls, taxes, monthly operating seasonality, lease-level forecasts
        and lender-specific covenants. Independently verify inputs and material
        decisions. Provided as-is without a guarantee of performance.
      </p>
      <h3>Metric guide</h3>
      <p>
        <strong>Cap rate:</strong> annual NOI divided by purchase price measures
        unlevered current income relative to price. <strong>DSCR:</strong>{" "}
        compares operating income with regular debt service.{" "}
        <strong>IRR:</strong> the discount rate at which the modeled equity cash
        flows have zero net present value. <strong>Sensitivity:</strong> a full
        recalculation under changed assumptions, not a forecast.
      </p>
    </section>
  );
}
