import { payment } from "../finance/debt";
import { dateAt, equityMultiple, xirr, xnpv } from "./returns";
import { validateTools } from "./toolSchema";
import type {
  Project,
  Unit,
  Monthly,
  DebtRecord,
  Forecast,
  DatedFlow,
  Loan,
} from "./types";
export function validateProject(p: Project): string[] {
  const errors: string[] = [];
  const visit = (v: unknown, path: string) => {
    if (typeof v === "number" && (!Number.isFinite(v) || Math.abs(v) > 1e12))
      errors.push(`${path}: enter a finite number within the supported range.`);
    else if (Array.isArray(v))
      v.forEach((x, i) => visit(x, `${path} ${i + 1}`));
    else if (v && typeof v === "object")
      Object.entries(v).forEach(([k, x]) => visit(x, `${path} ${k}`));
  };
  visit(p, "");
  if (p.tools) errors.push(...validateTools(p.tools));
  if (p.tools && Array.isArray(p.tools.absorption?.deposits))
    for (const d of p.tools.absorption.deposits) {
      const u = p.units.find((u) => u.id === d.unit);
      if (
        !u ||
        (u.saleMonth > 0 &&
          (d.month > u.saleMonth || d.refundMonth > u.saleMonth))
      )
        errors.push(
          "Buyer deposits require an existing unit and collection/refund before or at its closing.",
        );
    }
  if (p.tools && Array.isArray(p.tools.absorption?.deposits)) {
    for (const u of p.units) {
      const remaining = p.tools.absorption.deposits
        .filter((d) => d.unit === u.id && !d.refundMonth)
        .reduce((sum, d) => sum + d.amount, 0);
      if (u.saleMonth > 0 && remaining > u.salePrice)
        errors.push(
          `Unit ${u.id}: unrefunded buyer deposits exceed its sale price.`,
        );
    }
  }
  if (
    !/^\d{4}-\d{2}-01$/.test(p.startDate) ||
    !Number.isFinite(Date.parse(p.startDate))
  )
    errors.push("Forecast start must be a valid first-of-month date.");
  if (!Number.isInteger(p.months) || p.months < 12 || p.months > 120)
    errors.push("Forecast horizon must be 12–120 whole months.");
  if (
    p.price < 0 ||
    p.closing < 0 ||
    p.openingCash < 0 ||
    p.minimumCash < 0 ||
    p.initialCapex < 0 ||
    p.asOfEquity < 0 ||
    p.reservesMonthly < 0 ||
    p.otherMonthly < 0
  )
    errors.push("Property costs and cash balances cannot be negative.");
  if (!p.units.length || p.units.length > 500)
    errors.push("Use 1–500 units per project.");
  if (
    new Set(p.units.map((u) => u.id.trim().toLowerCase())).size !==
      p.units.length ||
    p.units.some((u) => !u.id.trim())
  )
    errors.push("Unit IDs must be present and unique.");
  const rate = (v: number, min = 0, max = 1) => v >= min && v <= max;
  if (
    !rate(p.creditLoss) ||
    !rate(p.management) ||
    !rate(p.contingency) ||
    !rate(p.sellingCost) ||
    !rate(p.exitCap, 0.001) ||
    !rate(p.discount, 0, 2) ||
    !rate(p.rentGrowth, -0.99, 1)
  )
    errors.push("Check property percentages; exit cap must be positive.");
  for (const u of p.units) {
    if (
      [
        u.rent,
        u.marketRent,
        u.renovationCost,
        u.renovatedRent,
        u.targetRent,
        u.concession,
        u.salePrice,
      ].some((v) => v < 0) ||
      !rate(u.renewalIncrease, -0.99)
    )
      errors.push(
        `Unit ${u.id}: costs/rents must be nonnegative and renewal growth valid.`,
      );
    if (
      [
        u.availableMonth,
        u.leaseEnd,
        u.turnoverMonths,
        u.renovationMonth,
        u.renovationMonths,
        u.targetMonth,
        u.concessionMonths,
        u.saleMonth,
      ].some((v) => !Number.isInteger(v) || v < 0 || v > 240)
    )
      errors.push(
        `Unit ${u.id}: schedule months must be whole numbers from 0–240.`,
      );
    if (
      u.renovationEnabled !== false &&
      u.renovationCost > 0 &&
      (u.renovationMonth < 1 || u.renovationMonths < 1)
    )
      errors.push(
        `Unit ${u.id}: renovation spending needs a positive start and duration.`,
      );
    for (const event of u.events ?? []) {
      if (
        !["rent", "lease", "vacant", "concession"].includes(event.kind) ||
        !Number.isInteger(event.month) ||
        event.month < 1 ||
        event.month > 240 ||
        !Number.isInteger(event.duration) ||
        event.duration < 1 ||
        event.duration > 240 ||
        event.amount < 0
      )
        errors.push(`Unit ${u.id}: invalid dated lease event.`);
    }
    if (
      (u.events?.length ?? 0) > 500 ||
      new Set((u.events ?? []).map((e) => e.id)).size !==
        (u.events?.length ?? 0)
    )
      errors.push(`Unit ${u.id}: use at most 500 unique events.`);
    if (
      p.strategy === "development-sale" &&
      u.saleMonth > 0 &&
      u.saleMonth < u.availableMonth
    )
      errors.push(`Unit ${u.id}: sale cannot precede delivery / availability.`);
  }
  for (const e of p.expenses)
    if (
      e.annual < 0 ||
      e.replacementAnnual < 0 ||
      e.reimbursement < 0 ||
      !rate(e.growth, -0.99)
    )
      errors.push(`Expense ${e.name}: invalid amount or growth.`);
  for (const b of p.budget)
    if (
      b.amount < 0 ||
      !Number.isInteger(b.start) ||
      b.start < 1 ||
      !Number.isInteger(b.duration) ||
      b.duration < 1
    )
      errors.push(
        `Budget ${b.name}: use a nonnegative amount and positive whole start/duration.`,
      );
  for (const l of p.loans) {
    if (
      l.rateCapExpiry !== undefined &&
      (!Number.isInteger(l.rateCapExpiry) ||
        l.rateCapExpiry < 0 ||
        l.rateCapExpiry > 240)
    )
      errors.push(`${l.name}: invalid rate-cap expiry month.`);
    if (
      l.amount < 0 ||
      !rate(l.rate) ||
      !rate(l.rateCap) ||
      !rate(l.fee) ||
      !rate(l.penalty) ||
      !rate(l.ltc) ||
      !rate(l.releasePercent, 0, 2) ||
      l.amortMonths < 1 ||
      l.ioMonths < 0 ||
      (l.kind === "term" && l.ioMonths >= l.amortMonths) ||
      l.maturityMonth <= l.fundingMonth
    )
      errors.push(`${l.name}: invalid debt terms.`);
    if (
      [
        l.fundingMonth,
        l.amortMonths,
        l.ioMonths,
        l.maturityMonth,
        l.refiMonth,
        l.refiAmort,
        l.refiIo,
        l.refiMaturity,
      ].some((v) => !Number.isInteger(v) || v < 0)
    )
      errors.push(`${l.name}: debt months must be whole numbers.`);
    if (
      l.refiMonth > 0 &&
      (l.refiMonth <= l.fundingMonth ||
        l.refiMonth > l.maturityMonth ||
        l.refiAmort <= l.refiIo ||
        l.refiMaturity <= l.refiMonth ||
        l.refiAmount < 0 ||
        !rate(l.refiRate) ||
        !rate(l.refiLtv) ||
        !rate(l.refiFee))
    )
      errors.push(
        `${l.name}: refinance must occur before maturity, with valid replacement terms.`,
      );
    if (
      l.ratePoints.some(
        (r) => !Number.isInteger(r.month) || r.month < 1 || !rate(r.annual),
      )
    )
      errors.push(`${l.name}: invalid rate reset.`);
  }
  if (
    p.loans.length > 20 ||
    new Set(p.loans.map((l) => l.name.trim().toLowerCase())).size !==
      p.loans.length ||
    p.loans.some((l) => !l.name.trim())
  )
    errors.push("Use at most 20 loans with unique names.");
  if (p.budget.length > 500 || p.expenses.length > 100)
    errors.push("Use at most 500 budget lines and 100 expense categories.");
  if (
    p.expenses.some((e) =>
      [e.startMonth, e.changeMonth].some((v) => !Number.isInteger(v) || v < 0),
    )
  )
    errors.push(
      "Expense start/change months must be nonnegative whole months.",
    );
  if (
    p.lender.minDscr <= 0 ||
    !rate(p.lender.maxLtv) ||
    !rate(p.lender.minYield, 0.0001) ||
    p.lender.value <= 0 ||
    p.lender.amortMonths < 1 ||
    p.lender.periodStart < 1 ||
    p.lender.periodStart > p.months - 11 ||
    p.lender.reserveAnnual < 0 ||
    !rate(p.lender.stressRate)
  )
    errors.push(
      "Lender sizing requires positive value, DSCR, yield, amortization and a complete 12-month forecast period.",
    );
  if (
    !p.partners.length ||
    Math.abs(p.partners.reduce((s, v) => s + v.share, 0) - 1) > 1e-6 ||
    p.partners.some((v) => v.share < 0 || v.share > 1) ||
    new Set(p.partners.map((v) => v.id)).size !== p.partners.length
  )
    errors.push(
      "Partner ownership shares must total 100%, with unique partners.",
    );
  if (
    !p.partners.some((v) => v.id === p.waterfall.sponsorId) ||
    !rate(p.waterfall.preferred) ||
    !rate(p.waterfall.promote)
  )
    errors.push("Choose a valid sponsor and waterfall percentages.");
  if (
    [p.tax.ordinaryRate, p.tax.capitalRate, p.tax.recaptureRate].some(
      (v) => !rate(v),
    ) ||
    p.tax.annualDepreciation < 0 ||
    p.tax.depreciableBasis < 0 ||
    p.tax.saleBasis < 0
  )
    errors.push("Tax rates and user-entered basis/depreciation must be valid.");
  if (
    p.historical.some(
      (f) =>
        !/^\d{4}-\d{2}-\d{2}$/.test(f.date) ||
        !Number.isFinite(Date.parse(f.date)) ||
        new Date(f.date).toISOString().slice(0, 10) !== f.date ||
        f.date >= p.startDate,
    )
  )
    errors.push(
      "Historical flows require valid dates before the forecast start.",
    );
  if (
    p.actuals.some(
      (r) =>
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month) ||
        [r.rent, r.otherIncome, r.opex, r.capex, r.debtService].some(
          (v) => v < 0,
        ),
    ) ||
    new Set(p.actuals.map((r) => r.month)).size !== p.actuals.length
  )
    errors.push(
      "Actuals require unique valid YYYY-MM periods and nonnegative values.",
    );
  return [...new Set(errors)].slice(0, 30);
}
function legacyUnitMonth(u: Unit, m: number, p: Project) {
  let vacant = !u.occupied && m < u.availableMonth;
  const renovation =
    u.renovationMonth > 0 &&
    m >= u.renovationMonth &&
    m < u.renovationMonth + u.renovationMonths;
  if (renovation) vacant = true;
  if (
    u.leaseEnd > 0 &&
    u.renewal === "vacate" &&
    m > u.leaseEnd &&
    m <= u.leaseEnd + u.turnoverMonths
  )
    vacant = true;
  if (p.strategy.startsWith("development") && m < u.availableMonth)
    vacant = true;
  if (p.strategy === "development-sale")
    return {
      rent: 0,
      potential: 0,
      concession: 0,
      occupied: 0,
      capex: renovation
        ? (u.renovationCost / u.renovationMonths) * (1 + p.contingency)
        : 0,
    };
  let rent = u.occupied ? u.rent : u.marketRent,
    baseMonth = u.occupied ? 1 : Math.max(1, u.availableMonth);
  const events: { month: number; rent: number }[] = [];
  if (u.renovationMonth > 0)
    events.push({
      month: u.renovationMonth + u.renovationMonths,
      rent: u.renovatedRent,
    });
  if (u.targetMonth > 0)
    events.push({ month: u.targetMonth, rent: u.targetRent });
  if (u.leaseEnd > 0 && u.renewal === "vacate")
    events.push({
      month: u.leaseEnd + u.turnoverMonths + 1,
      rent: u.marketRent,
    });
  for (const event of events.sort((a, b) => a.month - b.month))
    if (m >= event.month && event.month >= baseMonth) {
      rent = event.rent;
      baseMonth = event.month;
    }
  if (u.leaseEnd > 0 && u.renewal === "renew" && m > u.leaseEnd) {
    const first = u.leaseEnd + 1,
      start = Math.max(0, Math.floor((baseMonth - first) / 12) + 1),
      last = Math.floor((m - first) / 12);
    rent *= Math.pow(1 + u.renewalIncrease, Math.max(0, last - start + 1));
  }
  rent *= Math.pow(1 + p.rentGrowth, Math.max(0, m - baseMonth) / 12);
  const leaseStart = Math.max(
    !u.occupied ? u.availableMonth : 1,
    u.renovationMonth > 0 ? u.renovationMonth + u.renovationMonths : 1,
    u.renewal === "vacate" ? u.leaseEnd + u.turnoverMonths + 1 : 1,
  );
  const concession =
    !vacant && m >= leaseStart && m < leaseStart + u.concessionMonths
      ? Math.min(rent, u.concession)
      : 0;
  return {
    rent: vacant ? 0 : rent,
    potential: rent,
    concession,
    occupied: vacant ? 0 : 1,
    capex: renovation
      ? (u.renovationCost / u.renovationMonths) * (1 + p.contingency)
      : 0,
  };
}
export function unitMonth(original: Unit, m: number, p: Project) {
  const u =
    original.renovationEnabled === false
      ? { ...original, renovationMonth: 0, renovationCost: 0 }
      : original;
  const base = legacyUnitMonth(u, m, p);
  if (p.strategy === "development-sale" || !u.events?.length) return base;
  const events = u.events
    .filter((e) => e.month <= m)
    .sort((a, b) => a.month - b.month);
  const rentEvent = events
    .filter((e) => e.kind === "rent" || e.kind === "lease")
    .at(-1);
  let rent = rentEvent
    ? rentEvent.amount * Math.pow(1 + p.rentGrowth, (m - rentEvent.month) / 12)
    : base.potential;
  let occupied = base.occupied;
  const lease = events.filter((e) => e.kind === "lease").at(-1);
  if (lease) occupied = 1;
  const vacant = events
    .filter((e) => e.kind === "vacant" && m < e.month + e.duration)
    .at(-1);
  if (vacant && (!lease || vacant.month >= lease.month)) occupied = 0;
  if (
    u.renovationMonth > 0 &&
    m >= u.renovationMonth &&
    m < u.renovationMonth + u.renovationMonths
  )
    occupied = 0;
  const concession = events
    .filter((e) => e.kind === "concession" && m < e.month + e.duration)
    .at(-1);
  return {
    ...base,
    potential: rent,
    rent: occupied ? rent : 0,
    occupied,
    concession: occupied
      ? Math.min(rent, concession?.amount ?? base.concession)
      : 0,
  };
}
function operations(p: Project, m: number) {
  const units = p.units.map((u) => unitMonth(u, m, p));
  const rent = units.reduce((s, u) => s + u.rent, 0),
    concessions = units.reduce((s, u) => s + u.concession, 0),
    creditLoss = Math.max(0, rent - concessions) * p.creditLoss;
  let reimbursements = 0;
  const baseExpense = p.expenses.reduce((s, e) => {
    if (m < e.startMonth) return s;
    reimbursements += e.reimbursement;
    const changed = e.changeMonth > 0 && m >= e.changeMonth;
    return (
      s +
      ((changed ? e.replacementAnnual : e.annual) / 12) *
        Math.pow(1 + e.growth, (m - (changed ? e.changeMonth : 1)) / 12)
    );
  }, 0);
  const other = p.otherMonthly + reimbursements,
    egi = rent - concessions - creditLoss + other,
    expenses = baseExpense + Math.max(0, egi) * p.management;
  const budget = p.budget.filter(
      (b) => m >= b.start && m < b.start + b.duration,
    ),
    unitCapex = units.reduce((s, u) => s + u.capex, 0),
    capex =
      unitCapex +
      budget.reduce(
        (s, b) => s + (b.amount / b.duration) * (1 + p.contingency),
        0,
      );
  return {
    rent,
    concessions,
    creditLoss,
    other,
    expenses,
    noi: egi - expenses,
    occupied: units.reduce((s, u) => s + u.occupied, 0),
    vacancy: units.reduce((s, u) => s + u.potential - u.rent, 0),
    capex,
    eligible:
      unitCapex +
      budget
        .filter((b) => b.debtEligible)
        .reduce((s, b) => s + (b.amount / b.duration) * (1 + p.contingency), 0),
  };
}
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
        const charged = (s.balance * rate) / 12;
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
                        l.amortMonths - Math.max(s.age - 1, l.ioMonths),
                      ),
                    ) - charged,
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
        grossExit = forward / p.exitCap;
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
    const reserves = p.reservesMonthly,
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
function partnerReturns(p: Project, initial: number, rows: Monthly[]) {
  const states = p.partners.map((v) => ({
    ...v,
    capital: initial * v.share,
    pref: 0,
    contributed: initial * v.share,
    distributed: 0,
    flows: [{ date: p.startDate, amount: -initial * v.share }],
  }));
  for (const r of rows) {
    for (const s of states) {
      s.pref += p.waterfall.enabled
        ? (s.capital * p.waterfall.preferred) / 12
        : 0;
      s.capital += r.capitalCall * s.share;
      s.contributed += r.capitalCall * s.share;
    }
    let remaining = r.distribution;
    const paid = new Map(states.map((s) => [s.id, 0]));
    const allocate = (kind: "pref" | "capital") => {
      const total = states.reduce((a, s) => a + s[kind], 0),
        amount = Math.min(remaining, total);
      if (total > 0)
        for (const s of states) {
          const v = (amount * s[kind]) / total;
          s[kind] -= v;
          paid.set(s.id, (paid.get(s.id) ?? 0) + v);
        }
      remaining -= amount;
    };
    if (p.waterfall.enabled) {
      if (p.waterfall.returnCapitalFirst) {
        allocate("capital");
        allocate("pref");
      } else {
        allocate("pref");
        allocate("capital");
      }
      const promote = remaining * p.waterfall.promote;
      paid.set(
        p.waterfall.sponsorId,
        (paid.get(p.waterfall.sponsorId) ?? 0) + promote,
      );
      remaining -= promote;
    }
    for (const s of states) {
      const amount = (paid.get(s.id) ?? 0) + remaining * s.share;
      if (!p.waterfall.enabled) s.capital = Math.max(0, s.capital - amount);
      s.distributed += amount;
      s.flows.push({ date: r.date, amount: amount - r.capitalCall * s.share });
    }
  }
  return states.map((s) => ({
    id: s.id,
    name: s.name,
    contributed: s.contributed,
    distributed: s.distributed,
    endingCapital: s.capital,
    unpaidPref: s.pref,
    irr: xirr(s.flows).value,
    multiple: equityMultiple(s.flows),
  }));
}
