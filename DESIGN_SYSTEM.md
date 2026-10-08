# PropertyIQ design system

PropertyIQ keeps its existing navy-and-white identity and page structure. The shared source of visual values is `src/design-system.css`; existing styles reference those tokens. Shared component behavior is defined in `src/styles.css`.

## Colors

| Role    | Color   | Use                               |
| ------- | ------- | --------------------------------- |
| Navy    | #10264d | Headings, primary actions, brand  |
| Blue    | #235fbc | Links, selected navigation, focus |
| Text    | #263d58 | Ordinary body text                |
| Muted   | #45566c | Supporting text and captions      |
| White   | #ffffff | Cards and controls                |
| Canvas  | #f7f9fc | Page background                   |
| Border  | #dbe3ed | Card and control separators       |
| Success | #27634d | Favorable or completed states     |
| Warning | #775e2e | Review and caution states         |
| Error   | #9c3434 | Invalid inputs and failed actions |

Each status has a separate pale surface and border token. Chart series use the same navy, blue, warning and muted colors. Standalone image exports resolve these values from the shared theme so exported charts match the interface. Sensitivity intensity encodes numeric position using the shared blue and white palette. Labels and numeric values remain available independently of color.

## Typography

The sans-serif stack is Inter, system fonts and Segoe UI. Georgia remains the display face for the existing brand and financial headings. Screen sizes are 12, 14, 16, 20, 24, 32 and 48 pixels. Body text uses weight 400, controls 500, section headings 600 and emphasized labels 700. Heading line height is 1.2; paragraph line height is 1.6. Print has a compact, separately named scale and a 1.4 line height.

Page headings, card titles, field labels and buttons use shared rules. Large homepage headings reduce to 32 pixels on narrow screens. Standard workspace headings use 32 pixels on desktop and 24 on mobile.

## Spacing and shapes

Spacing tokens: 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 and 96 pixels. Cards use 24-pixel interior spacing; controls use smaller steps. Header height is 72 pixels. Normal and small controls have 40- and 36-pixel minimum heights.

Only three corner shapes are used: 6-pixel controls, 12-pixel panels and fully round badges or circles. Square print tables retain zero-radius edges. Border widths and shadows have named tokens.

Responsive widths, breakpoints, table/chart geometry, SVG drawing coordinates and the supplied logo's color matrix are structural values. They remain explicit rather than being treated as interchangeable spacing or palette choices. Print page margins have their own token.

## Interaction and loading

Controls change color and border over 140ms with cubic-bezier(0.2, 0, 0, 1). Hover states stay in place without glow. The only repeated motion is an 800ms progress spinner while an operation is actually pending; steady rotation uses linear timing. Reduced-motion mode disables the spinner and transitions. There are no decorative entrance sequences or staggered animations.

The shared loading component announces progress and can show static data placeholders. Imports, simulations and lazy-loaded data sections use it. Backups, attachment operations and chart image downloads expose progress and disable conflicting actions. Completion, cancellation and errors release busy states. Percent-complete indicators are not invented when the underlying operation cannot report progress.

Buttons retain their working actions; icon dimensions follow the control's font size. No social icons, testimonials, people portraits or hero emojis were added. Homepage copy describes property inputs, cash flow, financing and reports. The financial model and local-data storage conventions remain the existing ones.
