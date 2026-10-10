# 9. Refinance check, sell vs hold and a guided start

Status: accepted · 2026-10-09 (owner's answers in the Phase 5 interview)

ADR-0001 freezes calculations for UI work. These are new calculators, not changes to existing ones, so they are allowed:

- `src/finance/transactions.ts` holds two pure functions, `refinanceCheck` and `sellVsHold`. `sellVsHold` calls the existing `calculate()` for the hold case and never modifies it. Both have hand-computed tests (`transactions.test.ts`).
- **Refinance** shows: loan limits by value and by coverage, the new loan and which limit binds, closing costs, cash out or cash in, payment and DSCR before and after, and months to repay closing costs. Formulas are in METHODOLOGY.md.
- **Sell vs hold** shows: cash from selling today, the value of holding in today's dollars at the target return, the difference, return on today's equity, and the break-even exit cap.
- Both are Quick analysis sections ("Refinance check", "Sell vs hold"), reachable from the section menu or from the guided start.
- **Guided start** sits beside the composer under "Or start with a tool" (ADR-0008). Two steps: what is being decided (buy, refinance, sell or hold), then what kind of property (rental apartments, or a development for buying). It then uses the existing review screen, so the paste/upload path is unchanged.
- Taxes are not modeled in either calculator; the views say so.

Not decided: fix-and-flip and development-specific transactions (later), and persisting the calculators' own inputs.
