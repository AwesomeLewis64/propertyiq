# 1. Redesign supersedes the navy/Georgia design system

Status: accepted · 2026-10-08

The 2026 redesign moves PropertyIQ to an Apple-product-page look: large type, glass, soft layered shadows, large radii and purposeful motion. The old rules ("no decorative entrance sequences", Georgia display face, 6/12px radii) are replaced, not layered on top.

- `DESIGN_SYSTEM.md` stays the single source of truth and is rewritten. `src/design-system.css` stays the single token file. The impeccable `DESIGN.md` points at those two and does not repeat their values.
- e2e checks that lock old *values* (radius, heading sizes, `#10264d`) are updated to the new tokens. Accessibility checks (axe, focus, contrast) are never loosened.
- Display type is the system sans stack (SF on Apple, Segoe on Windows). Georgia is removed. No web font is shipped.
- Financial calculations are out of scope and must not change.
