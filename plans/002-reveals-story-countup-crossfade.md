# Plan 002: Scroll reveals, story card, KPI count-up, crossfades

Planned at `3613ea0` · Priority P1 · Effort L · Risk HIGH · Depends on: 001

## Why
Most of the Apple feel comes from this phase, and so does most of the risk: content hidden mid-animation breaks axe and the e2e visibility checks.

## Design (ADR-0002, 0005, 0006)
- **Reveal**: a `.reveal` class.
  - Where `@supports (animation-timeline: view())` holds: `animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 40%`.
  - Elsewhere: `src/ui/useReveal.ts` (one shared IntersectionObserver) adds `.is-revealed`, which triggers a CSS transition.
  - Content is visible by default. It is hidden only under `html.js-motion`, which `main.tsx` sets when reduced motion is off, so a failed script never hides content.
- **Story card** (`src/ui/StoryCard.tsx`, new): three text panels next to one `position: sticky` card.
  - An IntersectionObserver on the panels sets the active step as `data-step`. This works in every browser.
  - Each step's content crossfades with CSS.
  - Figures come from `sampleSummary()`, which `StartPage.tsx:72` already uses. No new math.
  - At 700px and narrower: not sticky; the steps render as three stacked cards.
  - The existing "how it works" section (`.iq-how`) becomes the story text.
- **Count-up** (`src/ui/useCountUp.ts`, new): `useCountUp(target: number | null, format)`.
  - Uses rAF: 900ms ease-out on first mount, then 300ms from the previous value on later changes.
  - `null` renders `format(null)` with no animation. Under reduced motion it shows the final value immediately.
  - Markup: `<strong><span aria-hidden="true">{animated}</span><span className="sr-only">{final}</span></strong>`.
  - Add a vitest unit test next to it, matching the style of the existing `*.test.ts` files.
- **Metrics** (`src/App.tsx:43-100`): change `data` from preformatted strings to `[label, number | null, formatter, help]` and render through the hook. `money`, `pct` and `multiple` stay as they are, and the calculations are untouched.
- **Crossfades** (`src/ui/viewTransition.ts`, new): `swap(fn)` calls `document.startViewTransition(() => flushSync(fn))` when it exists and reduced motion is off; otherwise it calls `fn()` directly.
  - Use it for StartPage `setReview` and App `setHome`/`setAdvanced`/`setView`.
  - The hashchange restore path stays a direct state change, so back and forward stay instant.

## Files
`src/main.tsx`, `src/App.tsx`, `src/ui/StartPage.tsx`, `src/ui/StoryCard.tsx` (new), `src/ui/useReveal.ts` (new), `src/ui/useCountUp.ts` (new, with test), `src/ui/viewTransition.ts` (new), `src/styles.css`.

## e2e risks
- Tests that read KPI text must read the final value. Use `toHaveText`, which retries until it matches, rather than a one-time read.
- Axe after reveals: in the axe loop, scroll to the bottom and wait until no animation is running (`document.getAnimations()`) before analyzing. Do not switch axe to reduced motion; that would hide real failures.

## STOP if
View Transitions conflict with `LegalShell` or the lazy `Suspense` boundaries, for example a loading fallback flashing inside a transition.

## Done
The gate passes. With reduced motion emulated, nothing moves and numbers show their final values immediately. At 390px the story steps stack with no horizontal overflow.
