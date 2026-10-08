import type { Project, Unit } from "../types";
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
  rent *= Math.pow(
    1 + p.rentGrowth,
    growthPeriod(p, Math.max(0, m - baseMonth)),
  );
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
  const rent = rentEvent
    ? rentEvent.amount *
      Math.pow(1 + p.rentGrowth, growthPeriod(p, m - rentEvent.month))
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
export function growthPeriod(p: Project, elapsed: number) {
  return p.growthTiming === "annual" ? Math.floor(elapsed / 12) : elapsed / 12;
}
export function operations(p: Project, m: number) {
  const units = p.units.map((u) => unitMonth(u, m, p));
  const rent = units.reduce((s, u) => s + u.rent, 0),
    concessions =
      units.reduce((s, u) => s + u.concession, 0) +
      rent * (p.concessionRate ?? 0),
    creditLoss =
      Math.max(0, p.additiveLosses ? rent : rent - concessions) * p.creditLoss,
    economicVacancy = rent * (p.vacancyRate ?? 0);
  let reimbursements = 0;
  const baseExpense = p.expenses.reduce((s, e) => {
    if (m < e.startMonth) return s;
    reimbursements += e.reimbursement;
    const changed = e.changeMonth > 0 && m >= e.changeMonth;
    return (
      s +
      ((changed ? e.replacementAnnual : e.annual) / 12) *
        Math.pow(
          1 + e.growth,
          growthPeriod(p, m - (changed ? e.changeMonth : 1)),
        )
    );
  }, 0);
  const other =
      p.otherMonthly * (1 + (p.otherGrowth ?? 0)) ** growthPeriod(p, m - 1) +
      reimbursements,
    egi = rent - concessions - creditLoss - economicVacancy + other,
    expenses =
      baseExpense +
      Math.max(0, egi) * p.management +
      ((p.fixedManagement ?? 0) / 12) *
        (1 + (p.fixedManagementGrowth ?? 0)) ** growthPeriod(p, m - 1);
  const budget = p.budget.filter(
      (b) => m >= b.start && m < b.start + b.duration,
    ),
    unitCapex = units.reduce((s, u) => s + u.capex, 0),
    capex =
      unitCapex +
      ((p.annualCapex ?? 0) / 12) *
        (1 + (p.inflation ?? 0)) ** growthPeriod(p, m - 1) +
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
    vacancy:
      economicVacancy + units.reduce((s, u) => s + u.potential - u.rent, 0),
    capex,
    eligible:
      unitCapex +
      budget
        .filter((b) => b.debtEligible)
        .reduce((s, b) => s + (b.amount / b.duration) * (1 + p.contingency), 0),
  };
}
