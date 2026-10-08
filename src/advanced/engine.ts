import { payment, accruedInterest } from "../finance/debt";
import { dateAt, equityMultiple, xirr, xnpv } from "./returns";
import type {
  Project,
  Monthly,
  DebtRecord,
  Forecast,
  DatedFlow,
  Loan,
} from "./types";
import { validateProject } from "./engine/validation";
import { operations, growthPeriod } from "./engine/operations";
import { partnerReturns } from "./engine/partners";
export { validateProject } from "./engine/validation";
export { unitMonth, operations } from "./engine/operations";
type LoanState = {
  terms: Loan;
  balance: number;
  age: number;
  active: boolean;
  done: boolean;
  refinanced: boolean;
};
export function forecast(p: Project): Forecast {
  const errors = validateProject(p),
    warnings: string[] = [];
  const empty: Forecast = {
    errors,
    warnings,
    rows: [],
    debt: [],
    initialEquity: 0,
    flows: [],
    irr: null,
    irrReason: "Correct assumptions.",
    npv: null,
    multiple: null,
    afterTaxIrr: null,
    inceptionIrr: null,
    additionalEquity: 0,
    lowestUnfundedCash: 0,
    grossExit: null,
    totalProfit: 0,
    sizing: {
      ncf: 0,
      annualServicePerDollar: 0,
      dscrLoan: 0,
      ltvLoan: 0,
      yieldLoan: 0,
      maximum: 0,
      binding: "Unavailable",
      reduction: 0,
      extraEquity: 0,
      coverage: null,
    },
    partners: [],
  };
  if (errors.length) return empty;
  const goingInNoi = Array.from(
    { length: 12 },
    (_, i) => operations(p, i + 1).noi,
  ).reduce((s, v) => s + v, 0);
  if (p.price > 0 && p.exitCap < goingInNoi / p.price)
    warnings.push(
      "Exit cap is below the going-in cap: this assumes cap-rate compression.",
    );
  if (p.strategy === "existing" && !p.historical.length)
    warnings.push(
      "Since-acquisition returns need dated historical contributions/distributions. Current-view returns use entered as-of equity.",
    );
  warnings.push(
    "Experimental model: reconcile source assumptions and lender terms before relying on results. Shortfalls are assumed funded by owners and shown as capital calls.",
  );
  const states: LoanState[] = p.loans.map((l) => ({
    terms: structuredClone(l),
    balance: 0,
    age: 0,
    active: l.fundingMonth === 0,
    done: false,
    refinanced: false,
  }));
  let funding0 = 0,
    fees0 = 0,
    remainingInitial = p.price + p.initialCapex;
  for (const s of states)
    if (s.active) {
      s.balance =
        s.terms.kind === "construction"
          ? Math.min(
              s.terms.amount,
              Math.max(0, remainingInitial) * s.terms.ltc,
            )
          : s.terms.amount;
      remainingInitial = Math.max(0, remainingInitial - s.balance);
      funding0 += s.balance;
      fees0 += p.strategy === "existing" ? 0 : s.terms.amount * s.terms.fee;
    }
  const initialEquity =
    p.strategy === "existing"
      ? p.asOfEquity
      : p.price + p.closing + p.initialCapex + p.openingCash + fees0 - funding0;
  if (initialEquity <= 0)
    return {
      ...empty,
      errors: [
        "Initial modeled equity must be positive. Reduce debt or correct sources and uses.",
      ],
    };
  let cash = p.openingCash,
    unfunded = p.openingCash,
    lowest = unfunded,
    additional = 0,
    grossExit: number | null = null,
    totalTaxDep = 0;
  const rows: Monthly[] = [],
    debt: DebtRecord[] = [],
    flows: DatedFlow[] = [{ date: p.startDate, amount: -initialEquity }],
    afterFlows: DatedFlow[] = [...flows];
  const actualByMonth = new Map(p.actuals.map((a) => [a.month, a]));
  for (let m = 1; m <= p.months; m++) {
    const date = dateAt(p.startDate, m - 1, true),
      o = operations(p, m),
      actual = actualByMonth.get(date.slice(0, 7));
    if (actual) {
      o.rent = actual.rent;
      o.other = actual.otherIncome;
      o.expenses = actual.opex;
      o.capex = actual.capex;
      o.eligible = Math.min(o.eligible, actual.capex);
      o.concessions = 0;
      o.creditLoss = 0;
      o.noi = o.rent + o.other - o.expenses;
    }
    let draws = 0,
      refinance = 0,
      payoffs = 0,
      fees = 0,
      service = 0,
      interest = 0;
    let eligible = o.eligible;
    const records: DebtRecord[] = [];
    for (const s of states) {
      const l = s.terms;
      let draw = 0,
        capitalized = 0,
        regular = 0,
        principal = 0,
        rate = l.rate;
      const opening = s.balance;
      let fundingFee = 0;
      if (!s.active && !s.done && m === l.fundingMonth) {
        s.active = true;
        draw = l.kind === "construction" ? 0 : l.amount;
        s.balance += draw;
        fundingFee = l.amount * l.fee;
        fees += fundingFee;
      }
      if (s.active && !s.done) {
        if (l.kind === "construction" && !s.refinanced) {
          draw += Math.min(
            Math.max(0, l.amount - s.balance),
            Math.max(0, eligible) * l.ltc,
          );
          s.balance += draw;
          eligible = Math.max(0, eligible - draw);
        }
        if (l.floating) {
          const reset = l.ratePoints
            .filter((r) => r.month <= m)
            .sort((a, b) => b.month - a.month)[0];
          rate =
            l.rateCapExpiry && m >= l.rateCapExpiry
              ? (reset?.annual ?? l.rate)
              : Math.min(l.rateCap, reset?.annual ?? l.rate);
        }
        s.age++;
        const charged = accruedInterest(s.balance, rate, m, {
          ...l,
          startDate: p.startDate,
        });
        if (l.kind === "construction" && !s.refinanced) {
          capitalized = l.capitalizeInterest
            ? Math.min(charged, Math.max(0, l.amount - s.balance))
            : 0;
          s.balance += capitalized;
          regular = charged - capitalized;
        } else {
          principal =
            s.age <= l.ioMonths
              ? 0
              : Math.min(
                  s.balance,
                  Math.max(
                    0,
                    payment(
                      s.balance,
                      rate,
                      Math.max(
                        1,
                        l.amortMonths -
                          (l.ioConvention === "consumes-term"
                            ? Math.max(s.age - 1, l.ioMonths)
                            : Math.max(0, s.age - 1 - l.ioMonths)),
                      ),
                    ) -
                      (s.balance * rate) / 12,
                  ),
                );
          regular = charged + principal;
          s.balance -= principal;
        }
        service += regular;
        interest += charged;
        draws += draw;
        records.push({
          month: m,
          loan: l.name,
          opening,
          draw,
          rate,
          interest: charged,
          capitalized,
          service: regular,
          principal,
          payoff: 0,
          fee: fundingFee,
          balance: s.balance,
          refinance: 0,
        });
      }
    }
    const sales =
      p.strategy === "development-sale"
        ? p.units
            .filter((u) => u.saleMonth === m)
            .reduce((s, u) => s + u.salePrice, 0)
        : 0;
    let saleAfterCosts = sales * (1 - p.sellingCost),
      netSale = saleAfterCosts;
    for (let i = 0; i < states.length; i++) {
      const s = states[i],
        l = s.terms;
      const record = records.find((r) => r.loan === l.name) ?? {
        month: m,
        loan: l.name,
        opening: s.balance,
        draw: 0,
        rate: l.rate,
        interest: 0,
        capitalized: 0,
        service: 0,
        principal: 0,
        payoff: 0,
        fee: 0,
        balance: s.balance,
        refinance: 0,
      };
      if (s.active && !s.done) {
        if (sales > 0 && l.kind === "construction") {
          const release = Math.min(
            s.balance,
            Math.max(0, saleAfterCosts) * l.releasePercent,
          );
          s.balance -= release;
          saleAfterCosts -= release;
          payoffs += release;
          record.payoff += release;
        }
        if (!s.refinanced && l.refiMonth === m) {
          const forward = Array.from(
            { length: 12 },
            (_, k) => operations(p, m + 1 + k).noi,
          ).reduce((a, b) => a + b, 0);
          const amount =
            l.refiAmount > 0
              ? l.refiAmount
              : Math.max(0, (forward / p.exitCap) * l.refiLtv);
          const payoff = s.balance,
            fee = amount * l.refiFee + payoff * l.penalty;
          payoffs += payoff;
          fees += fee;
          refinance += amount;
          record.payoff += payoff;
          record.fee += fee;
          record.refinance = amount;
          s.balance = amount;
          s.age = 0;
          s.refinanced = true;
          s.terms = {
            ...l,
            kind: "term",
            amount,
            rate: l.refiRate,
            floating: false,
            amortMonths: l.refiAmort,
            ioMonths: l.refiIo,
            maturityMonth: l.refiMaturity,
          };
        } else if (l.maturityMonth === m) {
          const payoff = s.balance;
          payoffs += payoff;
          record.payoff += payoff;
          fees += payoff * l.penalty;
          record.fee += payoff * l.penalty;
          s.balance = 0;
          s.done = true;
          warnings.push(
            `${l.name} matures in month ${m}; its balloon is paid from project cash / disclosed owner contributions.`,
          );
        }
      }
      record.balance = s.balance;
      if (!records.includes(record) && (record.payoff || record.refinance))
        records.push(record);
    }
    const liquidating =
      (p.strategy === "development-sale" && m === p.months) ||
      (p.strategy !== "development-sale" && p.sellAtEnd && m === p.months);
    if (liquidating && p.strategy !== "development-sale") {
      const forward = Array.from(
        { length: 12 },
        (_, k) => operations(p, m + 1 + k).noi,
      ).reduce((a, b) => a + b, 0);
      if (forward <= 0) {
        warnings.push(
          "Nonpositive forward NOI: terminal sale and returns are unavailable.",
        );
        grossExit = null;
      } else {
        const forwardTaxes = p.expenses
          .filter((e) => e.name.toLowerCase() === "taxes")
          .reduce(
            (sum, e) =>
              sum +
              e.annual *
                (1 + e.growth) **
                  (p.growthTiming === "annual" ? Math.floor(m / 12) : m / 12),
            0,
          );
        grossExit = p.taxReassessment
          ? (forward + forwardTaxes) /
            (p.exitCap + (p.reassessmentRate ?? 0.02))
          : forward / p.exitCap;
        netSale = grossExit * (1 - p.sellingCost);
      }
    }
    // Final liquidation repays remaining financing before distributing cash,
    // including residual development debt after partial unit-sale releases.
    if (
      liquidating &&
      (p.strategy === "development-sale" || grossExit !== null)
    ) {
      for (const s of states) {
        if (s.balance > 0) {
          const balance = s.balance;
          payoffs += balance;
          fees += balance * s.terms.penalty;
          records.push({
            month: m,
            loan: `${s.terms.name} exit payoff`,
            opening: balance,
            draw: 0,
            rate: s.terms.rate,
            interest: 0,
            capitalized: 0,
            service: 0,
            principal: 0,
            payoff: balance,
            fee: balance * s.terms.penalty,
            balance: 0,
            refinance: 0,
          });
          s.balance = 0;
          s.done = true;
        }
      }
    }
    if (actual) service = actual.debtService;
    const reserves =
        p.reservesMonthly * (1 + (p.inflation ?? 0)) ** growthPeriod(p, m - 1),
      preFin = o.noi - o.capex - reserves - service,
      net = preFin + draws + refinance - payoffs - fees + netSale,
      cashBefore = cash + net;
    const call = Math.max(0, (liquidating ? 0 : p.minimumCash) - cashBefore);
    cash = cashBefore + call;
    const distribution =
      p.distribute || liquidating
        ? Math.max(0, cash - (liquidating ? 0 : p.minimumCash))
        : 0;
    cash -= distribution;
    additional += call;
    unfunded += net - distribution;
    lowest = Math.min(lowest, unfunded);
    let tax = 0;
    if (p.tax.enabled) {
      const dep = Math.min(
        p.tax.annualDepreciation / 12,
        Math.max(0, p.tax.depreciableBasis - totalTaxDep),
      );
      totalTaxDep += dep;
      const taxable = o.noi - interest - dep;
      tax =
        (p.tax.lossOffset ? taxable : Math.max(0, taxable)) *
        p.tax.ordinaryRate;
      if (liquidating && grossExit !== null) {
        const gain = Math.max(
          0,
          grossExit * (1 - p.sellingCost) - p.tax.saleBasis + totalTaxDep,
        );
        const recapture = Math.min(gain, totalTaxDep);
        tax +=
          recapture * p.tax.recaptureRate +
          (gain - recapture) * p.tax.capitalRate;
      }
      if (sales > 0)
        tax +=
          Math.max(
            0,
            sales * (1 - p.sellingCost) -
              (p.tax.saleBasis / p.units.length) *
                p.units.filter((u) => u.saleMonth === m).length,
          ) * p.tax.ordinaryRate;
    }
    const equityFlow = distribution - call;
    rows.push({
      month: m,
      date,
      occupied: o.occupied,
      rent: o.rent,
      vacancy: o.vacancy,
      concessions: o.concessions,
      creditLoss: o.creditLoss,
      other: o.other,
      expenses: o.expenses,
      noi: o.noi,
      lenderNcf:
        o.noi - p.lender.reserveAnnual / 12 + p.lender.adjustmentAnnual / 12,
      capex: o.capex,
      reserves,
      debtService: service,
      interest,
      balance: states.reduce((a, s) => a + s.balance, 0),
      draws,
      refinance,
      payoffs,
      fees,
      sales,
      netSale,
      cashBefore,
      capitalCall: call,
      distribution,
      cash,
      equityFlow,
      tax,
      afterTaxFlow: equityFlow - tax,
      actual: !!actual,
      blocked: false,
    });
    debt.push(...records);
    flows.push({ date, amount: equityFlow });
    afterFlows.push({ date, amount: equityFlow - tax });
  }
  const incomplete =
    p.strategy === "development-sale"
      ? p.units.some(
          (u) => u.saleMonth < 1 || u.saleMonth > p.months || u.salePrice <= 0,
        )
      : p.sellAtEnd && grossExit === null;
  if (incomplete)
    warnings.push(
      "Terminal disposition is incomplete. Returns are suppressed; complete all unit sale schedules or a valid rental exit.",
    );
  if (!p.sellAtEnd && p.strategy !== "development-sale")
    warnings.push(
      "No terminal sale: return metrics include cash distributions only and exclude retained property value.",
    );
  const first = p.lender.periodStart - 1,
    sizingRows = rows.slice(first, first + 12),
    ncf = sizingRows.reduce((s, r) => s + r.lenderNcf, 0);
  const rate = p.lender.stressRate,
    serviceDollar = p.lender.useIO
      ? rate
      : payment(1, rate, p.lender.amortMonths) * 12;
  const dscrLoan =
      serviceDollar > 0
        ? Math.max(0, ncf / p.lender.minDscr / serviceDollar)
        : 1e12,
    ltvLoan = p.lender.value * p.lender.maxLtv,
    yieldLoan = Math.max(0, ncf / p.lender.minYield),
    maximum = Math.min(dscrLoan, ltvLoan, yieldLoan),
    binding =
      maximum === dscrLoan
        ? "DSCR"
        : maximum === ltvLoan
          ? "LTV"
          : "Debt yield",
    entered = p.loans
      .filter((l) => l.kind === "term" && l.fundingMonth === 0)
      .reduce((s, l) => s + l.amount, 0),
    reduction = Math.max(0, entered - maximum),
    extraEquity =
      reduction -
      p.loans
        .filter((l) => l.kind === "term" && l.fundingMonth === 0)
        .reduce(
          (s, l) => s + reduction * l.fee * (entered ? l.amount / entered : 0),
          0,
        );
  const returns = incomplete
    ? { value: null, reason: "Incomplete terminal disposition." }
    : xirr(flows);
  const inception = p.historical.length
    ? [
        ...p.historical.map(({ date, amount }) => ({ date, amount })),
        ...(p.strategy === "existing" ? flows.slice(1) : flows),
      ].sort((a, b) => a.date.localeCompare(b.date))
    : [];
  const partners = partnerReturns(p, initialEquity, rows);
  if (rows.some((r) => r.actual))
    warnings.push(
      "Actual debt-service overrides change cash flow, but do not replace modeled loan balances. Reconcile the loan balances separately.",
    );
  if (p.tax.enabled)
    warnings.push(
      "Tax scenario uses entered rates, basis and depreciation; excludes jurisdiction rules, loss limits, ownership-specific tax allocations and prior depreciation. Taxes are investor cash outflows, outside the project cash ledger.",
    );
  const result: Forecast = {
    errors,
    warnings: [...new Set(warnings)],
    rows,
    debt,
    initialEquity,
    flows,
    irr: returns.value,
    irrReason: returns.reason,
    npv: incomplete ? null : xnpv(flows, p.discount),
    multiple: incomplete ? null : equityMultiple(flows),
    afterTaxIrr: p.tax.enabled && !incomplete ? xirr(afterFlows).value : null,
    inceptionIrr:
      inception.length && !incomplete ? xirr(inception).value : null,
    additionalEquity: additional,
    lowestUnfundedCash: lowest,
    grossExit,
    totalProfit: flows.reduce((s, f) => s + f.amount, 0),
    sizing: {
      ncf,
      annualServicePerDollar: serviceDollar,
      dscrLoan,
      ltvLoan,
      yieldLoan,
      maximum,
      binding,
      reduction,
      extraEquity,
      coverage:
        entered * serviceDollar > 0 ? ncf / (entered * serviceDollar) : null,
    },
    partners,
  };
  if (
    rows.some((r) =>
      Object.values(r).some(
        (v) => typeof v === "number" && !Number.isFinite(v),
      ),
    )
  )
    return { ...empty, errors: ["Numerical overflow: reduce extreme inputs."] };
  return result;
}
