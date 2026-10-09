import type { Page } from "@playwright/test";

const menus = /^(Section|Tool|Project): /;

/**
 * On phones the section, tool and project menus sit behind a one-line summary
 * ("Section: …", "Tool: …", "Project: …"). Open any that are closed. Wide
 * screens render no summaries, so there is nothing to do.
 */
export async function openMenus(page: Page) {
  if ((page.viewportSize()?.width ?? 1440) > 760) return;
  const summaries = page.locator("summary", { hasText: menus });
  await summaries.first().waitFor({ state: "attached" });
  for (const summary of await summaries.all()) {
    if (!(await summary.isVisible())) continue;
    const open = await summary.evaluate(
      (el) => (el.parentElement as HTMLDetailsElement).open,
    );
    if (!open) await summary.click();
  }
}
