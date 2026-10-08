import type { Project, Unit, Forecast } from "./types";
import { unitMonth } from "./engine";
import { dateAt } from "./returns";
import {
  toolsFor,
  type MetricKey,
  type Scenario,
  type Offer,
} from "./toolSchema";

export function scenarioProject(p: Project, s: Scenario): Project {
  const q = structuredClone(p);
  q.actuals = [];
  q.exitCap = s.cap > 0 ? s.cap : p.exitCap;
  q.units = q.units.map((u) => ({
    ...u,
    rent: u.rent * s.rent,
    marketRent: u.marketRent * s.rent,
    targetRent: u.targetRent * s.rent,
    renovatedRent: u.renovatedRent * s.rent,
    salePrice: u.salePrice * s.rent,
    renovationCost: u.renovationCost * s.cost,
    renovationMonth: u.renovationMonth ? u.renovationMonth + s.delay : 0,
    availableMonth: u.availableMonth + s.delay,
    targetMonth: u.targetMonth ? u.targetMonth + s.delay : 0,
    saleMonth: u.saleMonth ? u.saleMonth + s.delay : 0,
    events: u.events?.map((e) => ({
      ...e,
      month: e.month + s.delay,
      amount:
        e.kind === "rent" || e.kind === "lease" ? e.amount * s.rent : e.amount,
    })),
  }));
  q.budget = q.budget.map((b) => ({
    ...b,
    amount: b.amount * s.cost,
    start: b.start + s.delay,
  }));
  q.loans = q.loans.map((l) => {
    const refiMonth = l.refiMonth ? l.refiMonth + s.refiDelay : 0;
    return {
      ...l,
      rate: Math.max(0, l.rate + s.rateShock),
      rateCap: Math.max(0, l.rateCap),
      // A fixed loan is stressed as a new quote. Floating paths are actual scheduled resets.
      ratePoints: l.ratePoints.map((r) => ({
        ...r,
        annual: Math.max(0, r.annual + s.rateShock),
      })),
      refiRate: Math.max(0, l.refiRate + s.rateShock),
      refiMonth,
      refiMaturity: l.refiMaturity + s.refiDelay,
      refiAmount: l.refiAmount > 0 ? l.refiAmount * s.refiProceeds : 0,
      refiLtv: l.refiAmount > 0 ? l.refiLtv : l.refiLtv * s.refiProceeds,
      rateCapExpiry: s.capExpiry || l.rateCapExpiry,
    };
  });
  return q;
}
export function periodRows(p: Project, f: Forecast) {
  const t = toolsFor(p).reconciliation;
  return f.rows.slice(t.start - 1, t.start - 1 + t.length);
}
export function metricValue(
  p: Project,
  f: Forecast,
  key: MetricKey,
): number | null {
  const rows = periodRows(p, f);
  const t = toolsFor(p).reconciliation;
  if (f.errors.length) return null;
  const complete = rows.length === t.length;
  const noi = rows.reduce((s, r) => s + r.noi, 0),
    ds = rows.reduce((s, r) => s + r.debtService, 0);
  switch (key) {
    case "noi":
      return complete ? noi : null;
    case "debt":
      return complete ? ds : null;
    case "dscr":
      return complete && ds > 0 ? noi / ds : null;
    case "equity":
      return f.initialEquity;
    case "funding":
      return f.additionalEquity;
    case "irr":
      return f.irr;
    case "npv":
      return f.npv;
    case "multiple":
      return f.multiple;
    case "exit":
      return f.grossExit;
  }
}
export function stabilizationMonth(p: Project, f: Forecast): number | null {
  const t = toolsFor(p).quality;
  for (let i = 0; i <= f.rows.length - 3; i++) {
    const rows = f.rows.slice(i, i + 3);
    if (
      rows.every(
        (r) =>
          r.occupied / p.units.length >= t.occupancyTarget &&
          (r.debtService > 0
            ? r.lenderNcf / r.debtService >= t.minDscr
            : r.lenderNcf >= 0),
      )
    )
      return i + 1;
  }
  return null;
}
export type RenovationRank = {
  id: string;
  cost: number;
  uplift: number;
  annualYield: number;
  payback: number | null;
  horizonNet: number;
  duration: number;
  start: number | null;
  selected: boolean;
};
export function renovationPlan(p: Project): RenovationRank[] {
  if (!Number.isInteger(p.months) || p.months < 12 || p.months > 120) return [];
  const limits = toolsFor(p).renovation;
  const rank = p.units
    .filter((u) => u.renovationCost > 0 && u.renovationMonths > 0)
    .map((u) => {
      const start = Math.max(1, limits.first),
        plan = { ...u, renovationEnabled: true, renovationMonth: start },
        baseline = { ...u, renovationEnabled: false },
        cost = u.renovationCost * (1 + p.contingency),
        keep = (1 - p.creditLoss) * (1 - p.management);
      let cumulative = 0,
        paidBack: number | null = null;
      for (let m = start; m <= p.months; m++) {
        const a = unitMonth(plan, m, p),
          b = unitMonth(baseline, m, p);
        cumulative +=
          (a.rent - a.concession - (b.rent - b.concession)) * keep - a.capex;
        if (
          m >= start + u.renovationMonths &&
          cumulative >= 0 &&
          paidBack === null
        )
          paidBack = m - start + 1;
      }
      const post = start + u.renovationMonths;
      const uplift =
        Array.from({ length: 12 }, (_, k) => {
          const a = unitMonth(plan, post + k, p),
            b = unitMonth(baseline, post + k, p);
          return (a.rent - a.concession - (b.rent - b.concession)) * keep;
        }).reduce((a, b) => a + b, 0) / 12;
      return {
        id: u.id,
        cost,
        uplift,
        annualYield: cost > 0 ? (uplift * 12) / cost : 0,
        payback: paidBack,
        horizonNet: cumulative,
        duration: u.renovationMonths,
        start: null,
        selected: false,
      } as RenovationRank;
    })
    .sort(
      (a, b) =>
        b.annualYield - a.annualYield ||
        b.horizonNet - a.horizonNet ||
        a.id.localeCompare(b.id),
    );
  let budget = limits.budget;
  const spend = Array(p.months + 1).fill(0),
    slots = Array(p.months + 1).fill(0);
  for (const r of rank) {
    if (
      r.uplift <= 0 ||
      r.horizonNet <= 0 ||
      r.cost > budget ||
      r.duration > p.months
    )
      continue;
    const unit = p.units.find((u) => u.id === r.id)!;
    for (
      let start = limits.first;
      start + r.duration - 1 <= p.months;
      start++
    ) {
      if (
        Array.from({ length: r.duration }, (_, i) => start + i).every(
          (m) =>
            slots[m] < limits.simultaneous &&
            spend[m] + r.cost / r.duration <= limits.monthly + 0.000001,
        )
      ) {
        // Delaying a good unit can leave too little holding time to recover its cost.
        const candidate = {
          ...unit,
          renovationEnabled: true,
          renovationMonth: start,
        };
        const baseline = { ...unit, renovationEnabled: false };
        let net = 0;
        let payback: number | null = null;
        for (let m = start; m <= p.months; m++) {
          const a = unitMonth(candidate, m, p),
            b = unitMonth(baseline, m, p);
          net +=
            (a.rent - a.concession - b.rent + b.concession) *
              (1 - p.creditLoss) *
              (1 - p.management) -
            a.capex;
          if (m >= start + r.duration && net >= 0 && payback === null)
            payback = m - start + 1;
        }
        if (net <= 0) continue;
        r.horizonNet = net;
        r.payback = payback;
        r.start = start;
        r.selected = true;
        budget -= r.cost;
        for (let m = start; m < start + r.duration; m++) {
          spend[m] += r.cost / r.duration;
          slots[m]++;
        }
        break;
      }
    }
  }
  return rank;
}
export function applyRenovationPlan(
  p: Project,
  rank: RenovationRank[],
): Project {
  const byId = new Map(rank.map((r) => [r.id, r]));
  return {
    ...p,
    units: p.units.map((u) => {
      const r = byId.get(u.id);
      return r
        ? {
            ...u,
            renovationEnabled: r.selected,
            renovationMonth: r.start ?? u.renovationMonth,
          }
        : u;
    }),
  };
}
export function offerProject(p: Project, o: Offer): Project {
  const q = structuredClone(p);
  q.actuals = [];
  const selected = q.loans.find(
    (l) => l.kind === "term" && l.fundingMonth === 0,
  );
  if (!selected)
    throw new Error(
      "Quote comparison needs an opening term loan. Construction quotes need their own draw assumptions.",
    );
  q.loans = q.loans.map((l) =>
    l.id === selected.id
      ? {
          ...l,
          name: o.name || "Compared quote",
          amount: o.amount,
          rate: o.rate,
          amortMonths: o.amort,
          ioMonths: o.io,
          maturityMonth: o.maturity,
          fee: o.fee,
          penalty: o.penalty,
          floating: false,
          refiMonth: 0,
        }
      : l,
  );
  q.openingCash += o.reserve;
  q.minimumCash += o.reserve;
  return q;
}
export function breakEven(
  p: Project,
  f: Forecast,
  month: number,
  capex = false,
) {
  const r = f.rows[month - 1];
  if (!r || f.errors.length) return null;
  const units = p.units.map((u) => unitMonth(u, month, p)),
    potential = units.reduce((s, u) => s + u.potential, 0);
  const egi = r.rent - r.concessions - r.creditLoss + r.other;
  const fixed = r.expenses - Math.max(0, egi) * p.management;
  const obligation = fixed + r.debtService + r.reserves + (capex ? r.capex : 0);
  const keep = 1 - p.management,
    collect = 1 - p.creditLoss;
  const billedNeeded =
    keep > 0 && collect > 0
      ? Math.max(0, (obligation / keep - r.other) / collect + r.concessions)
      : null;
  const occupancy =
    billedNeeded !== null && potential > 0 ? billedNeeded / potential : null;
  const rentFactor =
    billedNeeded !== null && r.rent > 0 ? billedNeeded / r.rent : null;
  const nominalSale =
    f.grossExit !== null && p.sellingCost < 1
      ? Math.max(0, f.grossExit - f.totalProfit / (1 - p.sellingCost))
      : null;
  return { potential, billedNeeded, occupancy, rentFactor, nominalSale };
}
export function absorptionPlan(p: Project): Unit[] {
  const a = toolsFor(p).absorption;
  let month = a.start,
    used = 0;
  const schedules = new Map<string, Unit>();
  for (const u of [...p.units].sort(
    (a, b) => a.availableMonth - b.availableMonth || a.id.localeCompare(b.id),
  )) {
    if (a.cancelled.includes(u.id)) {
      schedules.set(u.id, { ...u, saleMonth: 0 });
      continue;
    }
    if (u.availableMonth > month) {
      month = u.availableMonth;
      used = 0;
    }
    if (used >= a.pace) {
      month++;
      used = 0;
    }
    used++;
    schedules.set(u.id, {
      ...u,
      saleMonth: month,
      salePrice:
        (a.basePrices[u.id] ?? u.salePrice) *
        Math.pow(1 + a.priceGrowth, Math.max(0, month - a.start) / 12),
    });
  }
  return p.units.map((u) => schedules.get(u.id)!);
}
export function depositLedger(p: Project) {
  if (
    !Number.isFinite(Date.parse(p.startDate)) ||
    !Number.isInteger(p.months) ||
    p.months < 12 ||
    p.months > 120
  )
    return [];
  const deposits = toolsFor(p).absorption.deposits;
  let held = 0;
  return Array.from({ length: p.months }, (_, i) => {
    const m = i + 1,
      received = deposits
        .filter((d) => d.month === m)
        .reduce((s, d) => s + d.amount, 0),
      refund = deposits
        .filter((d) => d.refundMonth === m)
        .reduce((s, d) => s + d.amount, 0),
      released = deposits
        .filter(
          (d) =>
            d.month <= m &&
            (!d.refundMonth || d.refundMonth > m) &&
            p.units.some((u) => u.id === d.unit && u.saleMonth === m),
        )
        .reduce((s, d) => s + d.amount, 0);
    held += received - refund - released;
    return {
      month: m,
      date: dateAt(p.startDate, m - 1, true),
      received,
      refund,
      released,
      held,
    };
  });
}
export type QualityFlag = {
  severity: "review" | "missing";
  title: string;
  detail: string;
};
export function qualityFlags(p: Project, f: Forecast): QualityFlag[] {
  const t = toolsFor(p).quality,
    flags: QualityFlag[] = [];
  const add = (
    title: string,
    detail: string,
    severity: "review" | "missing" = "review",
  ) => flags.push({ title, detail, severity });
  const insurance = p.expenses
    .filter((e) => /insur/i.test(e.name))
    .reduce((s, e) => s + e.annual, 0);
  if (insurance / p.units.length < t.insurancePerUnit)
    add(
      "Insurance allowance is below your threshold",
      `${insurance / p.units.length} per unit annually; threshold ${t.insurancePerUnit}. This is a review rule, not a market estimate.`,
    );
  if (
    p.strategy !== "existing" &&
    !p.expenses.some((e) => /tax/i.test(e.name) && e.changeMonth > 0)
  )
    add(
      "No scheduled tax reassessment",
      "Confirm whether acquisition or construction changes the assessed value.",
    );
  if (
    (p.budget.some((b) => b.amount > 0) ||
      p.units.some(
        (u) => u.renovationCost > 0 && u.renovationEnabled !== false,
      )) &&
    !p.evidence.some((e) => e.type === "bid" && e.status !== "unverified")
  )
    add(
      "Capital budget has no reviewed bid",
      "Attach and review bids before treating costs as supported.",
      "missing",
    );
  const comps = p.evidence.filter(
    (e) => e.type === "rent comp" && e.status !== "unverified" && e.value > 0,
  );
  if (comps.length) {
    const mean = comps.reduce((s, e) => s + e.value, 0) / comps.length;
    const high = p.units.filter(
      (u) =>
        Math.max(u.targetRent, u.renovatedRent, u.marketRent) >
        mean * (1 + t.maxCompPremium),
    );
    if (high.length)
      add(
        "Rent assumptions exceed supplied comps",
        `${high.length} units exceed the unadjusted mean plus your ${t.maxCompPremium * 100}% allowance. Comps are not adjusted for unit differences.`,
      );
  } else
    add(
      "Rent targets have no reviewed comps",
      "The app does not source or verify market rents.",
      "missing",
    );
  if (p.strategy === "existing" && p.actuals.length < 12)
    add(
      "Fewer than 12 actual periods",
      "A full trailing operating statement has not been supplied.",
      "missing",
    );
  if (f.additionalEquity > 0)
    add(
      "Additional owner cash is required",
      `${f.additionalEquity} of capital calls are modeled. Confirm funding capacity.`,
    );
  if (p.loans.some((l) => l.refiMonth > 0))
    add(
      "Refinance is an assumption",
      "Entered proceeds require a future lender and valuation; this is not a committed loan.",
    );
  if (p.units.some((u) => (u.events?.length ?? 0) > 0))
    add(
      "Explicit lease events override rent assumptions",
      "Review overlaps with legacy target rents, renewals and renovation downtime.",
    );
  return flags;
}
export function calendarEvents(p: Project) {
  const events: {
    unit: string;
    month: number;
    end: number;
    kind: string;
    note: string;
  }[] = [];
  const add = (
    unit: string,
    month: number,
    duration: number,
    kind: string,
    note: string,
  ) => {
    if (month > 0)
      events.push({
        unit,
        month,
        end: month + Math.max(1, duration) - 1,
        kind,
        note,
      });
  };
  for (const u of p.units) {
    add(u.id, u.leaseEnd, 1, "Lease expiry", "");
    if (u.renovationEnabled !== false)
      add(
        u.id,
        u.renovationMonth,
        u.renovationMonths,
        "Renovation",
        String(u.renovationCost),
      );
    if (!u.occupied || p.strategy.startsWith("development"))
      add(u.id, u.availableMonth, 1, "Delivery / lease-up", "");
    add(u.id, u.targetMonth, 1, "Rent target", String(u.targetRent));
    if (p.strategy === "development-sale")
      add(u.id, u.saleMonth, 1, "Sale", String(u.salePrice));
    for (const e of u.events ?? [])
      add(
        u.id,
        e.month,
        e.kind === "vacant" || e.kind === "concession" ? e.duration : 1,
        e.kind,
        e.note,
      );
  }
  for (const b of p.budget)
    add(b.name, b.start, b.duration, "Capital budget", String(b.amount));
  for (const l of p.loans) {
    add(l.name, l.maturityMonth, 1, "Debt maturity", "");
    add(l.name, l.refiMonth, 1, "Refinance", "");
  }
  for (const d of toolsFor(p).decisions.filter(
    (d) => d.kind === "milestone" && /^\d{4}-\d{2}-\d{2}$/.test(d.due),
  )) {
    const month =
      (Number(d.due.slice(0, 4)) - Number(p.startDate.slice(0, 4))) * 12 +
      Number(d.due.slice(5, 7)) -
      Number(p.startDate.slice(5, 7)) +
      1;
    add(d.title, month, 1, "Milestone", d.status);
  }
  return events.sort(
    (a, b) => a.month - b.month || a.unit.localeCompare(b.unit),
  );
}
