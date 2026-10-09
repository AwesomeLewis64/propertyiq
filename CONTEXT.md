# PropertyIQ glossary (UI)

Terms used in the redesign ADRs (`docs/adr/`) and code. Financial terms are defined in METHODOLOGY.md.

- **Start page**: the `#home` route (`StartPage.tsx`): hero, composer, story, how-it-works.
- **Composer**: the hero form where a deal description is pasted or a file uploaded. Its submit button is **Analyze property**.
- **Input review**: the start page's second state (`review === true`), where extracted figures are checked before an analysis is created.
- **Quick analysis**: the annual workspace in `App.tsx` (`#quick/...`). Its default view is the **results** (overview).
- **Monthly planner**: `AdvancedWorkspace` (`#monthly`). It gets the shared tokens only.
- **Story card**: the sticky card on the start page that changes through three **steps**. It is not pinned on mobile.
- **Reveal**: the one-off fade and slide-up when a section enters the viewport.
- **KPI row**: the `Metrics` grid in quick analysis.
- **Count-up**: the first-appearance animation of a KPI from 0. **Tween**: later old-to-new value animation.
- **Sparkle**: the one-shot pastel burst when results first appear without errors.
- **Shine sweep**: the pastel highlight that crosses the Analyze button on hover or focus.
- **Glass**: a translucent, blurred surface (nav bar) built from tokens.
- **Hero glow**: the slow, low-contrast animated gradient behind the hero.
- **Crossfade**: the View Transition between start page, input review and results.
- **Theme toggle**: the sun/moon switch in each top bar. It sets `data-theme` on `<html>` and saves the choice; with no saved choice the system setting wins.
- **Chart glide**: the inspection dot that travels along a chart line to the inspected period.
- **Theme reveal**: the circular View Transition when the theme toggle is flipped.
- **Nav condense**: the start-page header turning into a floating pill as the page scrolls.
- **Deal summary**: the pinned bar above quick-analysis results with the target verdict and five headline figures; each jumps to its detail (ADR-0007).
- **Story**: the start-page section that merges the sample card and the three steps; one **story card** is pinned on wide screens.
- **Draw-in**: a chart's first appearance, uncovering the plot left to right (lines) or growing bars, triggered by the reveal observer.
