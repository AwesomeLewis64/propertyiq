# PropertyIQ glossary (UI)

Terms used in the redesign ADRs (`docs/adr/`) and code. Financial terms are defined in METHODOLOGY.md.

- **Start page**: the `#home` route (`StartPage.tsx`): hero, composer, story, how-it-works.
- **Composer**: the hero form where a deal description is pasted or a file uploaded. Its submit button is **Start an analysis**.
- **Input review**: the start page's second state (`review === true`), where extracted figures are checked before an analysis is created.
- **Quick analysis**: the annual workspace in `App.tsx` (`#quick/...`). Its default view is the **results** (overview).
- **Monthly planner**: `AdvancedWorkspace` (`#monthly`). It gets the shared tokens only.
- **Story card**: the sticky card on the start page that changes through three **steps**. It is not pinned on mobile.
- **Reveal**: the one-off fade and slide-up when a section enters the viewport.
- **KPI row**: the `Metrics` grid in quick analysis.
- **Count-up**: the first-appearance animation of a KPI from 0. **Tween**: later old-to-new value animation.
- **Sparkle**: the one-shot pastel burst on the Annual IRR figure when a new analysis first opens to results without errors.
- **Border beam**: the light that circles the border of the start page's primary button ("Start an analysis"). It replaced the hover-only shine sweep, which was hard to see on the dark button.
- **Glass**: a translucent, blurred surface (nav bar) built from tokens.
- **Hero glow**: the slow, low-contrast animated gradient behind the hero.
- **Crossfade**: the View Transition between start page, input review and results.
- **Theme toggle**: the sun/moon switch in each top bar. It sets `data-theme` on `<html>` and saves the choice; with no saved choice the system setting wins.
- **Chart glide**: the inspection dot that travels along a chart line to the inspected period.
- **Theme reveal**: the circular View Transition when the theme toggle is flipped.
- **Nav condense**: the start-page header turning into a floating pill as the page scrolls.
- **Deal summary**: the bar above quick-analysis results with the target verdict and five headline figures; each jumps to its detail (ADR-0007).
- **Story**: the start-page section that merges the sample card and the three steps; one **story card** is pinned on wide screens.
- **Draw-in**: a chart's first appearance, uncovering the plot left to right (lines) or growing bars, triggered by the reveal observer.
- **Chart zoom**: the visible window of periods on a long line chart; "Show all" returns to every period.
- **Tool search**: the monthly planner's "Search tools or topics" box; it matches tool names and the topics each tool covers (`src/advanced/toolTopics.ts`), showing the matched topic under the tool.
- **Guided start**: the two-step flow under "Or start with a tool" (what are you deciding, then what kind of property) that leads into the input review (ADR-0009).
- **Refinance check** and **Sell vs hold**: the two Quick analysis sections added by ADR-0009; pure calculators in `src/finance/transactions.ts`.
- **Tool row**: the quiet group under the start page's primary and secondary actions, labelled "Or start with a tool". Two centered cards (Quick analysis, Monthly planner) and an icon row of guided start, manual entry, the question buttons and "Open saved workspace" (ADR-0008).
- **Try a sample**: the start page's secondary action; opens Quick analysis results for the fictional Maple Grove deal.
- **Zero default**: an input that starts at 0 on a pasted or new analysis (vacancy, management, CapEx and others). The input review screen flags the ones that most change returns; the value is unchanged.
- **Section menu**: on phones, the one-line "Section: …" (Quick analysis) or "Tool: …" (Monthly planner) summary that opens the full list of sections; wide screens show the list directly.
- **Project panel**: on phones, the planner's "Project: name · saved time" summary that holds the project picker, origin note and project actions.
- **Tilt zone**: the stationary wrapper around the pinned sample card; the card inside leans toward the pointer, and the zone keeps hover steady at the edges.
