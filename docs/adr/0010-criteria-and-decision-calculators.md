# 10. Investment criteria and additive decision calculators

Status: accepted · 2026-10-09 (owner's request)

The next release adds a maximum-offer calculator, saved investment criteria, rent per sq ft, yearly cash-on-cash and a "what breaks first" analysis. All of them are additive: they call the existing engines and change no existing output (ADR-0001). Inputs that start at 0 stay 0 (ADR-0008).

## Where each item lives

PropertyIQ has two workspaces with separate engines and separate saved objects (an **analysis** in Quick analysis, a **project** in the Monthly planner). Each item goes where the code it builds on already is:

- Maximum offer and "what breaks first": Monthly planner, Decision Lab, monthly engine. The maximum offer borrows only the bisection shape of `breakEvenExitCap`.
- Yearly cash-on-cash: Quick analysis.
- Rent per sq ft: Monthly planner, Units & leasing, and the planner's import.
- Investment criteria: one shape, stored as an optional field on both saved objects. The deal summary reads the analysis's copy, Decision Lab the project's. Criteria are not copied when a deal is handed from Quick analysis to the planner.

Rejected: building every item for both engines (double the work and tests).

## Investment criteria

- Four targets: minimum annual IRR, minimum Year 1 DSCR, maximum initial equity, minimum Year 1 cash-on-cash.
- The minimum return is the figure each workspace already calls the target: `requiredReturn` in Quick analysis and `discount` (the required return) in the planner. The other three targets are new optional fields (`criteria`), kept out of the default factories so older saves load unchanged. The lender's `minDscr` and the planner's `quality.minDscr` are not reused, because they drive loan sizing and the stabilization month.
- Changed during the build (2026-10-09): the planner was first going to get its own minimum-return field. Its overview already prints "above/below your X% target" from `discount`, so a second field would have put two different return targets on screen. Editing the target in Decision Lab edits `discount`, exactly as editing it elsewhere does.
- Each target is in one of three states: meets, misses, or not enough information. "Not enough information" means the target is blank, the model has errors, or the figure cannot be computed (no IRR, no debt, zero equity). It is never shown as a pass.
- Origin does not block a pass. The existing origin note is shown beside the verdicts. Per-input verification waits for the verification queue.
- DSCR is tested on Year 1 (months 1-12 in the planner), the figure the deal summary already shows. A later dip, such as the end of interest-only, is not caught; the label says "Year 1".

## Maximum offer

- Bisection on price from 0 to 10 times the current price, to the nearest dollar. Every set target limits the price, including cash-on-cash. Not offered for an existing holding, where price does not change equity.
- A price too low to leave any equity is an engine error, not a missed target; the search treats it as below the valid range and never reports it as a result.
- "Hold LTV fixed" (default) scales the opening term loan to keep today's loan-to-price ratio. "Hold loan amount fixed" leaves it alone. Closing costs stay at the dollars entered in both modes, and the UI says so.
- With the loan amount fixed, Year 1 DSCR does not move with price; that target is reported as not depending on price.
- With no opening term loan, only the fixed-loan mode is offered.
- If no positive price qualifies, or every target still holds at the top of the range, the result says so in words. No number is shown.

## Yearly cash-on-cash

Denominator is initial equity, so Year 1 equals the existing Year 1 metric. Operating cash flow is shown apart from sale and refinance proceeds.

## What breaks first

Extends the existing break-even section with a second card. `breakEven()` itself is unchanged, because ADR-0001 freezes its output; the new analysis is a separate function that re-runs the forecast. Rent, vacancy, operating costs and interest rate are each moved until Year 1 cash flow turns negative, and until Year 1 DSCR falls below the saved target. A deal already negative in Year 1 says "already negative". Interest rate moves only on floating-rate loans; a plan with only fixed-rate loans, or no debt, lists it as not applicable. (The scenario and tornado tools still treat a fixed loan as a new quote; this one asks what can happen to the loan in place.)

## Rent per sq ft

Square footage per unit is optional, so old projects load unchanged. A blank shows "-". The property figure is total rent over total area, counting only units that have square footage, with a note of how many do. Current rent per sq ft uses occupied units; market rent per sq ft uses all units with area.
