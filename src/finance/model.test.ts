import { describe, it, expect } from "vitest";
import { calculate, operating, validate } from "./model";
import { debtSchedule, payment } from "./debt";
import { irr } from "./irr";
import { demo } from "./demo";
const input = () => structuredClone(demo);
describe("Independent financial benchmarks", () => {
  it("the complete fictional demo matches a separate 40-digit Decimal model", () => {
    const m = calculate(input());
    expect(m.initialEquity).toBe(1134200);
    expect(m.years[0].noi).toBe(247119);
    expect(m.years[4].noi).toBeCloseTo(279734.919381765, 6);
    expect(m.forwardNOI).toBeCloseTo(288535.352281054575, 6);
    expect(m.years[4].debt?.balance).toBeCloseTo(1693589.294175316, 6);
    expect(m.netSale).toBeCloseTo(2634440.990040503, 6);
    expect(m.irr).toBeCloseTo(0.257954907143508178, 10);
    expect(m.multiple).toBeCloseTo(2.835137409921937943, 10);
  });
  it("Microsoft periodic IRR example matches an independently solved root", () =>
    expect(irr([-70000, 12000, 15000, 18000, 21000, 26000]).value).toBeCloseTo(
      0.086630948036531614,
      10,
    ));
  it("A: cap rate is 10% for modeled $100k NOI / $1m price", () => {
    const a = input();
    Object.assign(a, {
      price: 1000000,
      units: 10,
      rent: 1000,
      otherIncome: 0,
      vacancy: 0,
      creditLoss: 0,
      concessions: 0,
      management: 0,
    });
    for (const k of Object.keys(a.expenses))
      a.expenses[k as keyof typeof a.expenses] = 0;
    a.expenses.taxes = 20000;
    const m = calculate(a);
    expect(m.years[0].noi).toBe(100000);
    expect(m.years[0].noi / a.price).toBe(0.1);
  });
  it("B: no-debt DSCR is unavailable and debt cash flow is zero", () => {
    const a = input();
    a.ltv = 0;
    const m = calculate(a);
    expect(m.years[0].dscr).toBeNull();
    expect(m.years[0].debt?.service).toBe(0);
  });
  it("C: vacancy converts $120k rent potential into $114k EGI", () => {
    const a = input();
    Object.assign(a, {
      units: 10,
      rent: 1000,
      vacancy: 0.05,
      creditLoss: 0,
      concessions: 0,
      otherIncome: 0,
    });
    expect(operating(a, 1).egi).toBe(114000);
  });
  it("D: forward NOI $150k / 6% yields $2.5m", () => {
    const a = input();
    Object.assign(a, {
      units: 10,
      rent: 1250,
      vacancy: 0,
      creditLoss: 0,
      concessions: 0,
      otherIncome: 0,
      management: 0,
      rentGrowth: 0,
      expenseGrowth: 0,
      exitCap: 0.06,
    });
    Object.keys(a.expenses).forEach(
      (k) => (a.expenses[k as keyof typeof a.expenses] = 0),
    );
    const m = calculate(a);
    expect(m.forwardNOI).toBe(150000);
    expect(m.grossExit).toBe(2500000);
  });
  it("E: initial equity includes costs and loan fees exactly once", () => {
    const a = input();
    Object.assign(a, {
      price: 1000000,
      closingCosts: 20000,
      initialCapex: 50000,
      loanMode: "amount",
      loanAmount: 700000,
      loanFee: 10000 / 700000,
    });
    expect(calculate(a).initialEquity).toBe(380000);
  });
  it("6% $500k 30-year mortgage matches independently computed closed-form benchmarks", () => {
    const s = debtSchedule(500000, 0.06, 30, 10, 0, 5);
    expect(payment(500000, 0.06, 360)).toBeCloseTo(2997.752625763764, 8);
    expect(s.years[0].balance).toBeCloseTo(493859.9414386164, 6);
    expect(s.years[0].principal).toBeCloseTo(6140.05856138359, 6);
    expect(s.years[0].interest).toBeCloseTo(29832.97294778155, 6);
    expect(s.years[4].balance).toBeCloseTo(465271.7841140978, 6);
  });
  it("zero-interest loan amortizes principal linearly", () => {
    const s = debtSchedule(120000, 0, 10, 10, 0, 5);
    expect(s.monthlyPayment).toBe(1000);
    expect(s.years[4].balance).toBe(60000);
    expect(s.years[0].interest).toBe(0);
  });
  it("interest-only recasts over remaining original amortization months", () => {
    const s = debtSchedule(120000, 0.06, 10, 10, 12, 5);
    expect(s.years[0].service).toBe(7200);
    expect(s.years[0].principal).toBe(0);
    expect(s.months[12].payment).toBeCloseTo(1440.68995571107, 8);
  });
  it("full amortization leaves zero balances without negative principal", () => {
    const s = debtSchedule(120000, 0.06, 3, 10, 0, 5);
    expect(s.years[2].balance).toBe(0);
    expect(s.years[3].service).toBe(0);
    expect(s.months.every((m) => m.principal >= 0)).toBe(true);
  });
  it("known periodic IRRs: 10%, -50%, zero, and a two-year 10% sequence", () => {
    expect(irr([-100, 110]).value).toBeCloseTo(0.1, 10);
    expect(irr([-100, 50]).value).toBeCloseTo(-0.5, 10);
    expect(irr([-100, 100]).value).toBeCloseTo(0, 10);
    expect(irr([-100, 0, 121]).value).toBeCloseTo(0.1, 10);
  });
  it("IRR refuses missing signs, nonfinite inputs and ambiguous multiple sign changes", () => {
    expect(irr([1, 2]).value).toBeNull();
    expect(irr([-100, NaN]).value).toBeNull();
    expect(irr([-100, 230, -132]).value).toBeNull();
    expect(irr([-100, 0]).value).toBeNull();
  });
  it("Year 1 starts with input assumptions and Year 6 is grown five times", () => {
    const a = input();
    expect(operating(a, 1).grossRent).toBe(372000);
    expect(operating(a, 6).grossRent).toBeCloseTo(372000 * 1.03 ** 5, 6);
  });
  it("equity cash flow deducts debt payment once and includes sale once", () => {
    const m = calculate(input()),
      y = m.years[4];
    expect(y.operatingCash).toBeCloseTo(
      y.noi - y.debt!.service - y.reserves - y.capex,
      8,
    );
    expect(y.equityCash).toBeCloseTo(y.operatingCash! + m.netSale!, 8);
    expect(m.netSale).toBeCloseTo(m.grossExit * 0.975 - y.debt!.balance, 8);
    expect(m.flows?.length).toBe(6);
    expect(m.flows?.[0]).toBe(-m.initialEquity);
  });
  it("maturity before exit stops schedule and suppresses incomplete returns", () => {
    const a = input();
    a.maturity = 3;
    const m = calculate(a);
    expect(m.months.length).toBe(36);
    expect(m.refinanceRequired).toBe(true);
    expect(m.years[3].operatingCash).toBeNull();
    expect(m.irr).toBeNull();
    expect(m.netSale).toBeNull();
  });
  it("maturity at exit pays remaining balance through sale exactly once", () => {
    const a = input();
    a.maturity = 5;
    const m = calculate(a);
    expect(m.refinanceRequired).toBe(false);
    expect(m.netSale).toBeCloseTo(
      m.grossExit * 0.975 - m.years[4].debt!.balance,
      8,
    );
  });
  it("equity multiple includes negative operating years as additional contributions", () => {
    const a = input();
    a.annualCapex = 200000;
    const m = calculate(a);
    expect(m.invested!).toBeGreaterThan(m.initialEquity);
    expect(m.multiple).toBeCloseTo(m.distributions! / m.invested!, 10);
  });
  it("validates loss rates, costs, term ranges, loan limits and invalid numbers", () => {
    const a = input();
    a.vacancy = 0.95;
    a.creditLoss = 0.1;
    expect(validate(a).length).toBeGreaterThan(0);
    const b = input();
    b.price = NaN;
    b.expenses.insurance = -1;
    b.loanAmount = 1e10;
    b.loanMode = "amount";
    b.interestOnlyMonths = 400;
    expect(validate(b).length).toBeGreaterThan(3);
  });
  it("rent-roll contractual rent is never reduced again by physical vacancy", () => {
    const a = input();
    Object.assign(a, {
      mode: "rentRoll",
      occupiedMonthlyRent: 9000,
      vacancy: 0.1,
      creditLoss: 0,
      concessions: 0,
      otherIncome: 0,
    });
    expect(operating(a, 1).egi).toBe(108000);
    expect(operating(a, 1).vacancyLoss).toBe(0);
  });
  it("rent-roll loss validation excludes the unapplied manual vacancy assumption", () => {
    const a = input();
    Object.assign(a, {
      mode: "rentRoll",
      occupiedMonthlyRent: 9000,
      vacancy: 0.95,
      creditLoss: 0.1,
      concessions: 0,
    });
    expect(validate(a)).toEqual([]);
  });
  it("three-year sale uses Year 4 NOI and debt at month 36 with no post-sale debt", () => {
    const a = input();
    a.hold = 3;
    const m = calculate(a);
    expect(m.months).toHaveLength(36);
    expect(m.forwardNOI).toBe(operating(a, 4).noi);
    expect(m.flows).toHaveLength(4);
    expect(m.years[3].debt).toBeNull();
    expect(m.netSale).toBeCloseTo(
      m.grossExit * 0.975 - m.years[2].debt!.balance,
      8,
    );
  });
  it("negative forward NOI makes exit returns unavailable", () => {
    const a = input();
    a.expenses.taxes = 1000000;
    const m = calculate(a);
    expect(m.netSale).toBeNull();
    expect(m.irr).toBeNull();
  });
  it("all yearly schedule sums reconcile with monthly rows", () => {
    const m = calculate(input());
    for (const y of m.years) {
      expect(y.debt!.opening - y.debt!.principal).toBeCloseTo(
        y.debt!.balance,
        6,
      );
      expect(y.debt!.service).toBeCloseTo(
        y.debt!.interest + y.debt!.principal,
        6,
      );
    }
  });
  it("balloon obligations are explicit and block maturity-year equity cash flow before exit", () => {
    const a = input();
    a.maturity = 3;
    const m = calculate(a);
    expect(m.years[2].debt?.balloon).toBe(m.years[2].debt?.balance);
    expect(m.years[2].operatingCash).toBeNull();
  });
  it("extreme numerical inputs fail validation or valuation rather than returning infinity", () => {
    const a = input();
    a.rent = 1e100;
    expect(calculate(a).errors.length).toBeGreaterThan(0);
    const b = input();
    b.exitCap = Number.MIN_VALUE;
    expect(calculate(b).errors.length).toBeGreaterThan(0);
  });
});
