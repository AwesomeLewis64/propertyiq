# PropertyIQ design system

The single source of visual values is `src/design-system.css`; components reference its tokens, and `src/styles.css` holds component rules (the 2026 redesign layer sits at the end of that file). Decisions behind this system: `docs/adr/0001`–`0006`. Vocabulary: `CONTEXT.md`.

## Direction

An Apple-product-page feel: very large calm type, generous space, soft layered depth, frosted-glass navigation and purposeful motion. One blue-to-indigo gradient is reserved for the hero's key phrase. Pastel pink, violet and cyan appear only in the Analyze button's shine and the success sparkle (ADR-0006).

## Color

Every color is a role token. Light values live on `:root`; dark values redefine the same tokens under `:root[data-theme="dark"]`. `public/theme.js` sets `data-theme` before first paint from the saved choice or the system setting, and the sun/moon switch (`ThemeToggle`) saves a choice (ADR-0004).

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| Ink | #0d1628 | #f1f4f9 | Headings, primary text, brand |
| Text | #2a3547 | #d2d9e4 | Body text |
| Muted | #4e596b | #a1acbd | Supporting text, captions |
| Accent | #1f5ccc | #7aaaff | Links, primary actions, focus |
| Surface | #ffffff | #141922 | Cards and controls |
| Canvas | #f5f6f8 | #0a0d13 | Page background |
| Border | #e2e6ec | #2a3140 | Separators |
| Key gradient | #1f5ccc → #5b3fd9 | #7aaaff → #a58bff | Hero key phrase only |

Success, warning and danger each have text, soft-surface and border tokens in both schemes. Glass (`--color-glass`, `--color-glass-border`) is used only by the sticky navigation. In light mode cards are separated by shadow alone (`--color-card-border` is transparent). In dark mode, where shadows don't read, they get a border. Labels and numbers never rely on color alone; dashed chart series stay dashed.

## Typography

The system sans stack (SF on Apple platforms, Segoe UI Variable on Windows) for both text and display. No web font is shipped. The hero headline is fluid, `clamp(44px, 8vw, 96px)` (40–56px on phones), weight 700, tracking −0.035em, line height 1.02. Section headings run 32–48px at weight 700. Body sizes stay on the 12/14/16/20/24 scale. Numbers use tabular figures.

## Shape and depth

Radii: `--radius-control` 10px, `--radius-panel` 18px, `--radius-hero` 28px (hero composer and the sample card; 18px on phones), `--radius-round` for pills, switches and primary hero buttons. Shadows are layered and offset: `--shadow-card` (resting), `--shadow-raised` (hover) and `--shadow-overlay` (the composer and overlays). Print keeps square, shadowless tables.

## Motion

- Easing: `--ease-standard` for color, `--ease-out-expo` for entrances, `--ease-spring` (a CSS `linear()` spring with ~6% overshoot, 520ms) for lifts and the theme knob.
- Ambient: the hero glow drifts over a 28s alternate loop and animates only transform.
- Hover: on devices with real hover, cards lift 4px with a 1.5° tilt, and buttons lift 1px.
- Reduced motion: one global rule at the end of `styles.css` disables every animation and transition, current and future. The progress spinner animates only while work is actually pending.

## Accessibility

WCAG 2.1 AA in both schemes, enforced by axe in the e2e suite. Focus uses a 2px accent outline offset 4px. The gradient phrase has a solid accent fallback and `CanvasText` under forced colors. Layouts hold at 390px with no horizontal overflow.

## Unchanged

The financial model, local-data storage, loading/progress semantics, honest copy (fictional samples labelled, no invented social proof) and print styles are unchanged.
