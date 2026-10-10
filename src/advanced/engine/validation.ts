import { validateTools } from "../toolSchema";
import type { Project } from "../types";
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
    !rate(p.vacancyRate ?? 0) ||
    !rate(p.concessionRate ?? 0) ||
    (p.vacancyRate ?? 0) + (p.concessionRate ?? 0) + p.creditLoss > 1
  )
    errors.push(
      "Combined economic vacancy, concessions and credit loss cannot exceed 100%.",
    );
  if (
    !rate(p.otherGrowth ?? 0, -0.99) ||
    !rate(p.inflation ?? 0, -0.99) ||
    !rate(p.fixedManagementGrowth ?? 0, -0.99) ||
    (p.annualCapex ?? 0) < 0 ||
    (p.fixedManagement ?? 0) < 0 ||
    !rate(p.reassessmentRate ?? 0.02)
  )
    errors.push(
      "Check growth, inflation, capital allowance and tax assumptions.",
    );
  if (
    p.growthTiming !== undefined &&
    !["annual", "monthly"].includes(p.growthTiming)
  )
    errors.push("Unknown growth timing.");
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
        u.sqft ?? 0,
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
      l.ioConvention !== undefined &&
      !["after-io", "consumes-term"].includes(l.ioConvention)
    )
      errors.push("Unknown IO convention.");
    if (
      l.accrual !== undefined &&
      !["30/360", "actual/360"].includes(l.accrual)
    )
      errors.push("Unknown interest accrual.");
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
      (l.kind === "term" &&
        l.ioConvention === "consumes-term" &&
        l.ioMonths >= l.amortMonths) ||
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
