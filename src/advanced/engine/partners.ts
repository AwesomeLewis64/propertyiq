import { xirr, equityMultiple } from "../returns";
import type { Project, Monthly } from "../types";
export function partnerReturns(p: Project, initial: number, rows: Monthly[]) {
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
