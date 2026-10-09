# 7. A deal summary above quick-analysis results

Status: accepted · 2026-10-09 (owner's request)

People should not have to scroll to find the headline answers. `src/ui/DealSummary.tsx` renders a compact bar at the top of quick-analysis results. It scrolls with the page; the owner decided pinning it was unnecessary (2026-10-09):

- A verdict against the target return ("IRR above 10% target" / "IRR below 10% target"; reworded 2026-10-09 because "Meets 10.00% target" read as "100%"), in words, not color alone.
- Annual IRR, Year 1 NOI, DSCR, cash-on-cash and equity needed. Each is a button that jumps to where the figure is explained (overview metrics, cash flows, debt schedule).
- On phones it shows the verdict plus IRR, NOI and DSCR in one row. It replaces the old phone-only IRR/multiple/DSCR strip.

It is hidden when the model has errors, on Methodology and Import views, and in print. Values come straight from the existing model; no calculation changed.
