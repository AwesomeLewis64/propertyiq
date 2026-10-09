# Working notes for PropertyIQ

- Ask specific questions and agree a plan before coding. For anything a user will see, state the plan, the files you will touch and what you will leave alone.
- Finance calculations are frozen for UI work ([ADR-0001](docs/adr/0001-supersede-design-system.md)). Inputs that start at 0 (vacancy, management, CapEx) stay 0 unless an ADR changes them ([ADR-0008](docs/adr/0008-trust-and-clarity-pass.md)).
- No "AI-powered" claims. PropertyIQ is free, private, in-browser and needs no account.
- Keep README feature descriptions and test counts accurate. Update tests when behavior changes.
- Verify with `pnpm typecheck && pnpm lint && pnpm test`, then `pnpm build && pnpm test:e2e`, and look at 390×844 and desktop.
- On phones the Quick sections, planner tools and project panel sit behind "Section:", "Tool:" and "Project:" summaries. e2e specs call `openMenus(page)` from `e2e/menu.ts` before clicking those buttons.
- e2e runs regenerate tracked files under `docs/screenshots` and `docs/verification`. Stage explicit paths when committing.
- Vocabulary is in [CONTEXT.md](CONTEXT.md); design tokens are in `src/design-system.css`.
