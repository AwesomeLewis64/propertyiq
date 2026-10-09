# 4. Dark mode follows the system until the user flips the switch

Status: accepted · 2026-10-08 (revised the same day: the owner asked for a sun/moon toggle)

- `public/theme.js` runs before first paint: it sets `<html data-theme="light|dark">` from `localStorage["propertyiq:theme"]`, falling back to `prefers-color-scheme`, and keeps following the system while no choice is saved. It is a file, not an inline script, because the CSP is `script-src 'self'`.
- `src/design-system.css` redefines the same color tokens once, under `:root[data-theme="dark"]`. There is no second palette anywhere else.
- `src/ui/ThemeToggle.tsx` is a `role="switch"` button (sun/moon knob) in the start page nav, the quick-analysis top bar and the monthly-planner top bar. It saves the choice.
- Every token pair must pass axe contrast in both schemes; the e2e accessibility loop runs once per scheme.
