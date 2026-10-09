# 8. A trust-and-clarity pass before new features

Status: accepted · 2026-10-09 (owner's answers in the grill-with-docs interview)

A phased pass (bugs and metadata, start page copy, results-first layout, saving and accessibility) comes before any new transaction types or a guided wizard. Decisions that shape it:

- **Primary user: the small or newer investor.** Plain-English helper text sits under technical labels; the technical labels stay. Professional users are served by the same screens, not a separate mode.
- **One primary action on the start page: paste or upload** (the composer, "Start an analysis"). The secondary action is **Try a sample**, which opens Quick analysis results. Monthly planner, manual entry, the three question buttons and "Open saved workspace" move into one quiet **Other ways to start** group, each with a one-line "Use this when…".
- **Zero defaults stay zero.** Vacancy, management and CapEx start at 0 for pasted deals (`setupAnnual`, `freshAnalysis`). They are not changed here. They become editable fields on the input review screen, still defaulting to 0, with a visible flag that they move returns most. Changing the stored defaults needs its own ADR and the owner's numbers.
- **No AI claims.** The product is free, private and in-browser with no account. `index.html` social metadata must say so.
- **Finance logic is frozen** (ADR-0001). UI work does not change calculations.
- **Test determinism:** functional Playwright specs run with `reducedMotion: "reduce"`; one dedicated spec keeps motion on. No sleeps.
- **The placeholder contact address stays** for now (owner's decision).
- **The "glitchy on iPhone" report** is treated as an iOS Safari rendering problem first, not a layout-overflow problem: page-level overflow measured zero at 390px in Chromium emulation.

Not decided: whether a wizard replaces or sits beside the composer, which transaction types come first, and acceptable default vacancy, management and CapEx values. These are Phase 5 questions.
