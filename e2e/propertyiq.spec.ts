import { openMenus } from "./menu";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const screenshotDir = resolve("docs/screenshots");
mkdirSync(screenshotDir, { recursive: true });
// Let entrance motion finish before axe measures contrast; ambient loops are ignored.
async function settleMotion(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) =>
          a.playState !== "running" ||
          a.effect?.getTiming().iterations === Infinity ||
          a.timeline !== document.timeline,
      ),
  );
}
async function shot(page: Page, name: string, project: string) {
  if (name === "quick")
    await expect(
      page.getByRole("heading", { name: "Sensitivity tornado", exact: true }),
    ).toBeVisible();
  // Full-page captures include sections that never scrolled into view.
  await page.evaluate(() =>
    document
      .querySelectorAll("[data-reveal]")
      .forEach((el) => el.setAttribute("data-shown", "")),
  );
  await settleMotion(page);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );
  });
  await page.screenshot({
    path: resolve(screenshotDir, `${name}-${project}.png`),
    fullPage: true,
  });
}
async function quick(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample" }).click();
  await expect(
    page.getByRole("heading", { name: "Investment overview", exact: true }),
  ).toBeVisible();
}
async function income(page: Page) {
  const details = page.locator(".mobile-assumptions");
  if (
    (await details.isVisible()) &&
    (await details.getAttribute("open")) === null
  )
    await details.locator(":scope > summary").click();
  const section = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "Income & growth" }) })
    .last();
  if ((await section.getAttribute("open")) === null)
    await section.locator("summary").click();
}
test("shared demo, changing inputs, money formatting and no console errors", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  // The story renders one card per step on phones and one pinned card on wide screens.
  await expect(
    page
      .getByText("$254,732", { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await shot(page, "start", info.project.name);
  await page.getByRole("button", { name: "Try a sample" }).click();
  await expect(
    page.locator(".metric").filter({ hasText: "Annual IRR" }).locator("strong"),
  ).toHaveText("14.17%");
  await shot(page, "quick", info.project.name);
  await income(page);
  await page
    .getByRole("textbox", { name: "Monthly rent per unit", exact: true })
    .fill("2,000");
  await page
    .getByRole("textbox", { name: "Monthly rent per unit", exact: true })
    .press("Tab");
  await expect(
    page.getByRole("textbox", { name: "Monthly rent per unit", exact: true }),
  ).toHaveValue("$2,000.00");
  await expect(
    page.locator(".metric").filter({ hasText: "Annual IRR" }).locator("strong"),
  ).not.toHaveText("14.17%");
  await page.getByRole("button", { name: "Save locally", exact: true }).click();
  await expect(page.locator(".local-message")).toBeVisible();
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Reset to example" }).click();
  await page.getByRole("button", { name: "Load saved", exact: true }).click();
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(
    page.locator(".metric").filter({ hasText: "Annual IRR" }).locator("strong"),
  ).not.toHaveText("14.17%");
  await openMenus(page);
  await page
    .getByRole("button", { name: "Investment report", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Print / Save as PDF" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/#quick\/report$/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Print / Save as PDF" }),
  ).toBeVisible();
  await shot(page, "report", info.project.name);
  if (info.project.name === "desktop") {
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".topbar")).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Print / Save as PDF" }),
    ).toBeHidden();
    await shot(page, "report-print", info.project.name);
    await page.emulateMedia({ media: "screen" });
  }
  expect(errors).toEqual([]);
});
for (const file of ["rent-roll.csv", "rent-roll.xlsx"]) {
  test(`import and apply ${file}`, async ({ page }) => {
    await quick(page);
    await openMenus(page);
    await page
      .getByRole("button", { name: "Rent roll import", exact: true })
      .click();
    await page
      .getByLabel("Upload rent roll")
      .setInputFiles(resolve("public/samples", file));
    await page
      .getByRole("button", { name: /Apply.*rent.roll|Apply to analysis/i })
      .click();
    await openMenus(page);
    await page
      .getByRole("button", { name: "Investment overview", exact: true })
      .click();
    await expect(
      page.getByText("Current rent roll", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}
test("import shows what will change, can be undone, and a bad file offers a way forward", async ({
  page,
}) => {
  await quick(page);
  await openMenus(page);
  await page
    .getByRole("button", { name: "Rent roll import", exact: true })
    .click();
  const upload = page.getByLabel("Upload rent roll");
  await upload.setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a spreadsheet"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Choose a CSV or XLSX file",
  );
  await expect(
    page.getByRole("button", { name: "Choose another file" }),
  ).toBeVisible();
  await upload.setInputFiles(resolve("public/samples", "rent-roll.csv"));
  const changes = page.getByLabel("What will change");
  await expect(changes).toContainText(/Units: 20 → \d+/);
  await expect(changes).toContainText("manual stabilized");
  await page.getByRole("button", { name: /Apply Rent Roll/ }).click();
  await expect(page.getByText("Rent roll applied.")).toBeVisible();
  await page.getByRole("button", { name: "Undo import" }).click();
  await expect(page.getByText("Rent roll applied.")).toBeHidden();
  await expect(changes).toContainText("manual stabilized");
});
test("local save status shows last saved, unsaved edits and the backup reminder", async ({
  page,
}) => {
  await quick(page);
  const status = page.locator(".local-status");
  await expect(status).toContainText("Not saved yet");
  await page.getByRole("button", { name: "Save locally", exact: true }).click();
  await expect(status).toContainText(/Saved .*No backup of this save yet/);
  await income(page);
  await page.getByLabel("Other monthly income", { exact: true }).fill("900");
  await page.getByLabel("Other monthly income", { exact: true }).press("Tab");
  await expect(status).toContainText("Unsaved changes");
  await page.getByRole("button", { name: "Save locally", exact: true }).click();
  await page.locator("summary", { hasText: "Backup" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Quick backup" }).click();
  await download;
  await expect(status).toContainText("Backup downloaded");
});
test("new start, review, import and report states have no serious axe violations", async ({
  page,
}) => {
  const serious: unknown[] = [];
  const check = async (where: string) => {
    await settleMotion(page);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    for (const v of result.violations)
      if (v.impact === "serious" || v.impact === "critical")
        serious.push({
          where,
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        });
  };
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    await check(`${scheme} start`);
    await page.getByRole("button", { name: "Enter numbers manually" }).click();
    await expect(
      page.getByRole("heading", { name: /start at 0 and change/ }),
    ).toBeVisible();
    await page.locator(".iq-defaults-panel > summary").click();
    await check(`${scheme} review`);
    await page.goto("/#quick/report");
    await expect(page.locator(".report-metrics small").first()).toBeVisible();
    await check(`${scheme} report`);
    await page.goto("/#quick/import");
    await expect(page.getByLabel("Upload rent roll")).toBeVisible();
    await page.getByLabel("Upload rent roll").setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("x"),
    });
    await expect(page.getByRole("alert")).toBeVisible();
    await check(`${scheme} import error`);
  }
  expect(serious).toEqual([]);
});
test("new start-page controls show a keyboard focus ring", async ({ page }) => {
  await page.goto("/");
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    const onExample = await page.evaluate(() =>
      document.activeElement?.classList.contains("iq-composer-example"),
    );
    if (onExample) break;
  }
  const ring = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const s = getComputedStyle(el);
    return {
      on: el.classList.contains("iq-composer-example"),
      style: s.outlineStyle,
      width: parseFloat(s.outlineWidth),
    };
  });
  expect(ring.on).toBe(true);
  expect(ring.style).not.toBe("none");
  expect(ring.width).toBeGreaterThan(0);
});
test("composer extraction and editable assumption defaults", async ({
  page,
}, info) => {
  await page.goto("/");
  await page
    .getByLabel("Paste deal details", { exact: true })
    .fill("$2.8M purchase; 20 units at $1,900/mo; 6.25% rate; 65% LTV");
  await expect(page.locator(".brief-preview")).toContainText("rent: 38,000");
  await page
    .getByRole("button", { name: "Start an analysis", exact: true })
    .click();
  await page.getByLabel("Property name", { exact: true }).fill("Reviewed case");
  await expect(
    page.getByRole("heading", { name: "Assumptions we filled in" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Purchase price ($)", { exact: true }),
  ).toHaveValue("$2,800,000.00");
  await settleMotion(page);
  const setupAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    setupAxe.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    ),
  ).toEqual([]);
  await page
    .getByLabel("Purchase price ($)", { exact: true })
    .fill("3,000,000");
  await page.getByLabel("Purchase price ($)", { exact: true }).press("Tab");
  await expect(
    page.getByLabel("Purchase price ($)", { exact: true }),
  ).toHaveValue("$3,000,000.00");
  await shot(page, "setup", info.project.name);
  await page
    .getByRole("button", { name: "Create analysis", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Investment overview", exact: true }),
  ).toBeVisible();
});
test("start page leads with one action, states trust and flags zero defaults", async ({
  page,
}) => {
  await page.goto("/");
  const start = page.getByRole("button", {
    name: "Start an analysis",
    exact: true,
  });
  await expect(start).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try a sample", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Free, no account")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "How the math is validated" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Or start with a tool" }),
  ).toBeVisible();
  // The example text is clickable and fills the composer.
  const composer = page.getByLabel("Paste deal details", { exact: true });
  await expect(composer).toHaveValue("");
  await page.getByRole("button", { name: /^Try “/ }).click();
  await expect(composer).not.toHaveValue("");
  await start.click();
  await expect(
    page.getByRole("heading", { name: /you trust the returns/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /start at 0 and change your returns/ }),
  ).toBeVisible();
  await page.getByLabel("Vacancy (% of rent)", { exact: true }).fill("5");
  await page
    .getByLabel("Management fee (% of income)", { exact: true })
    .fill("4");
  await page
    .getByRole("button", { name: "Create analysis", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Investment overview", exact: true }),
  ).toBeVisible();
  await income(page);
  await expect(page.getByLabel("Economic vacancy").first()).toHaveValue(
    /^5(\.0+)?%?$/,
  );
});
test("quick results sit above exports and backups", async ({ page }) => {
  await page.goto("/#quick/overview");
  await expect(
    page.getByRole("heading", { name: "Investment overview", exact: true }),
  ).toBeVisible();
  const summary = await page.locator(".deal-summary").boundingBox();
  const actions = await page
    .locator(".workspace-main > .workspace-actions")
    .boundingBox();
  const saved = await page.locator(".local-analyses").boundingBox();
  expect(summary && actions && saved).toBeTruthy();
  expect(summary!.y).toBeLessThan(actions!.y);
  expect(summary!.y).toBeLessThan(saved!.y);
});
test("phones fold sections and assumptions away so results come first", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 1440) > 700, "phone layout only");
  await page.goto("/#quick/overview");
  const section = page.locator("summary", {
    hasText: "Section: Investment overview",
  });
  await expect(section).toBeVisible();
  const cash = page.locator(".nav-sidebar nav button", {
    hasText: "Cash flows",
  });
  await expect(cash).toBeHidden();
  await expect(page.locator(".mobile-assumptions")).not.toHaveAttribute(
    "open",
    "",
  );
  await section.click();
  await cash.click();
  await expect(
    page.getByRole("heading", { name: "Cash flows", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("summary", { hasText: "Section: Cash flows" }),
  ).toBeVisible();
});
test("report metrics explain themselves and link to their calculation", async ({
  page,
}) => {
  await page.goto("/#quick/report");
  await expect(page.locator(".report-metrics small").first()).not.toBeEmpty();
  await page.getByRole("button", { name: "Year 1 NOI", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Income and operating performance" }),
  ).toBeInViewport();
});
test.describe("motion polish with motion on", () => {
  test.use({ reducedMotion: "no-preference" });
  test("the primary action has a border beam and a theme switch cleans up after itself", async ({
    page,
  }) => {
    await page.goto("/");
    const beam = await page
      .locator(".iq-analyze")
      .evaluate((el) => getComputedStyle(el, "::before").animationName);
    expect(beam).toBe("iq-beam");
    const html = page.locator("html");
    const before = await html.getAttribute("data-theme");
    await page.getByRole("switch", { name: "Dark mode" }).click();
    await expect(html).not.toHaveAttribute("data-theme", before ?? "");
    // The reveal class is removed once the transition ends, restoring transitions.
    await expect(html).not.toHaveClass(/theme-reveal/);
  });
});
test("guided start leads a refinance question to the refinance check", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Guided start" }).click();
  await expect(
    page.getByRole("heading", { name: "What are you deciding?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Refinance a loan/ }).click();
  await expect(
    page.getByRole("heading", { name: "What kind of property?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Rental apartments/ }).click();
  await expect(
    page.getByRole("heading", { name: /you trust the returns/ }),
  ).toBeVisible();
  await page.getByLabel("Number of units", { exact: true }).fill("20");
  await page.getByLabel("Value today ($)", { exact: true }).fill("3,000,000");
  await page
    .getByLabel("Total monthly rent ($)", { exact: true })
    .fill("38000");
  await page
    .getByLabel("Annual operating expenses ($)", { exact: true })
    .fill("150000");
  await page
    .getByLabel("Opening loan balance / amount ($)", { exact: true })
    .fill("1,800,000");
  await page.getByLabel("Annual interest rate (%)", { exact: true }).fill("7");
  await page
    .getByRole("button", { name: "Create analysis", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Refinance check", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Months to repay closing costs")).toBeVisible();
});
test("refinance and sell-vs-hold answer with the sample deal", async ({
  page,
}) => {
  await page.goto("/#quick/refinance");
  await expect(
    page.getByRole("heading", { name: "Refinance check", exact: true }),
  ).toBeVisible();
  await page.getByLabel("New interest rate (%)", { exact: true }).fill("5");
  await expect(page.getByText(/^Saves \$/)).toBeVisible();
  await expect(page.getByText(/\d+\.\d months/)).toBeVisible();
  await page.goto("/#quick/sellhold");
  await expect(
    page.getByRole("heading", { name: "Sell vs hold", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Break-even exit cap")).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: /more than/ }),
  ).toBeVisible();
});
test("monthly wayfinding, exact project history, deep links and legal routing", async ({
  page,
}, info) => {
  await page.goto("/#monthly/maple-grove-shared/overview");
  await expect(
    page.getByRole("heading", { name: "Property overview", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".verdict-strip")).toContainText("Monthly planner");
  await expect(
    page.locator(".adv-metrics").getByText("$254,732", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".planner-sidebar nav button")).toHaveCount(8);
  await shot(page, "monthly", info.project.name);
  await openMenus(page);
  await page.getByRole("button", { name: "More tools", exact: true }).click();
  await expect(page.locator(".planner-sidebar nav button")).toHaveCount(19);
  await openMenus(page);
  await page.getByText("Project actions", { exact: true }).click();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  const id = await page.getByLabel("Active local project").inputValue();
  await openMenus(page);
  await page
    .getByRole("button", { name: "Debt & borrowing capacity", exact: true })
    .click();
  const targetUrl = page.url();
  await expect(page).toHaveURL(new RegExp(`#monthly/${id}/finance$`));
  await openMenus(page);
  await page
    .getByRole("button", { name: "Property report", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "View report", exact: true }),
  ).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(targetUrl);
  await expect(page.getByLabel("Active local project")).toHaveValue(id);
  await page.goForward();
  await expect(page.getByLabel("Active local project")).toHaveValue(id);
  await page.reload();
  await expect(page.getByLabel("Active local project")).toHaveValue(id);
  await expect(
    page.getByRole("heading", { name: "Property report", exact: true }),
  ).toBeVisible();
  await openMenus(page);
  await page.getByRole("button", { name: "Decision Lab", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Lender quote comparison" }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.location.hash = "#contact";
  });
  await expect(
    page.getByRole("heading", { name: "Contact PropertyIQ", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Email abc@gmail.com" }),
  ).toBeVisible();
});
test("live hash changes switch modes and retain legal pages", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.location.hash = "#monthly/maple-grove-shared/finance";
  });
  await expect(
    page.getByRole("heading", {
      name: "Debt & borrowing capacity",
      exact: true,
    }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.location.hash = "#quick/sensitivity";
  });
  await expect(
    page
      .getByRole("heading", { name: "Sensitivity analysis", exact: true })
      .first(),
  ).toBeVisible();
  await expect(page.getByText(/Green with an up chevron: above/)).toBeVisible();
});
test("accessibility and 390px overflow on key screens", async ({
  page,
}, info) => {
  const allViolations: unknown[] = [];
  for (const [scheme, route] of (["light", "dark"] as const).flatMap((scheme) =>
    [
      "/",
      "/#quick/overview",
      "/#quick/sensitivity",
      "/#monthly/maple-grove-shared/overview",
    ].map((route) => [scheme, route] as const),
  )) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
    await expect(page.locator("main:visible")).toBeVisible();
    await page.locator("h1").first().waitFor();
    await expect(
      page.getByRole("status").filter({ hasText: /Opening|Loading/ }),
    ).toHaveCount(0);
    await settleMotion(page);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const serious = result.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    allViolations.push(
      ...serious.map((v) => ({
        route,
        scheme,
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          detail: n.failureSummary,
        })),
      })),
    );
    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
      x: scrollX,
      body: document.body.getBoundingClientRect().toJSON(),
      root: document.getElementById("root")?.getBoundingClientRect().toJSON(),
      wide: Array.from(document.querySelectorAll("body *"))
        .filter(
          (e) =>
            e.scrollWidth > 390 && getComputedStyle(e).overflowX === "visible",
        )
        .map((e) => ({
          tag: e.tagName,
          cls: e.className,
          sw: e.scrollWidth,
          rect: e.getBoundingClientRect().toJSON(),
        }))
        .slice(0, 20),
    }));
    const overflowing = await page.evaluate(() =>
      Array.from(document.querySelectorAll("body *"))
        .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
        .map((e) => ({
          tag: e.tagName,
          cls: e.className,
          width: e.getBoundingClientRect().width,
          right: e.getBoundingClientRect().right,
        }))
        .slice(0, 20),
    );
    expect(
      dimensions.scroll,
      JSON.stringify({ route, overflowing, dimensions }),
    ).toBeLessThanOrEqual(dimensions.client);
  }
  await shot(page, "monthly-accessible", info.project.name);
  expect(allViolations).toEqual([]);
});

test.describe("top bars with motion on", () => {
  // The start header condenses on scroll; reduced motion would hide overflow it causes.
  test.use({ reducedMotion: "no-preference" });
  test("keep every control inside the viewport from 320px to 768px", async ({
    page,
  }) => {
    for (const route of ["/", "/#quick/overview", "/#monthly"]) {
      await page.goto(route);
      // A hash-only goto keeps the old h1, so wait on this route's own shell.
      await page
        .locator(
          route === "/"
            ? ".iq-start-header"
            : route.includes("quick")
              ? ".annual-topbar"
              : ".planner-sidebar",
        )
        .first()
        .waitFor();
      for (const width of [320, 360, 375, 390, 430, 744, 768]) {
        await page.setViewportSize({ width, height: 844 });
        for (const y of [0, 400]) {
          await page.evaluate((top) => window.scrollTo(0, top), y);
          await page.evaluate(
            () =>
              new Promise<void>((r) =>
                requestAnimationFrame(() => requestAnimationFrame(() => r())),
              ),
          );
          const fit = await page.evaluate(() => {
            const header = document.querySelector("header")!;
            const box = header.getBoundingClientRect();
            const visible = Array.from(
              header.querySelectorAll("button, a"),
            ).filter((e) => e.getBoundingClientRect().width > 0);
            const tools = document.querySelector(
              'nav[aria-label="Property analysis tools"]',
            );
            return {
              toolsSpill: tools ? tools.scrollWidth - tools.clientWidth : 0,
              pinned:
                innerWidth <= 760 &&
                !!document.querySelector(".planner-sidebar") &&
                getComputedStyle(document.querySelector(".planner-sidebar")!)
                  .position === "sticky",
              spill: header.scrollWidth - header.clientWidth,
              right: Math.max(
                ...visible.map((e) => e.getBoundingClientRect().right),
              ),
              edge: Math.min(box.right, innerWidth),
            };
          });
          const where = `${route} at ${width}px, scrollY ${y}`;
          expect(fit.spill, where).toBeLessThanOrEqual(0);
          expect(fit.pinned, `${where} planner bar pinned`).toBe(false);
          expect(fit.toolsSpill, `${where} planner tools`).toBeLessThanOrEqual(
            0,
          );
          expect(fit.right, where).toBeLessThanOrEqual(fit.edge);
          await expect(
            page.locator("header .brand").first(),
            where,
          ).toHaveAccessibleName(/PropertyIQ/);
        }
      }
    }
  });
});
test("all monthly tools render, remain accessible and fit the viewport", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [],
    violations: unknown[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const tools = [
    ["overview", "Property overview"],
    ["report", "Property report"],
    ["decisionlab", "Decision Lab"],
    ["reconciliation", "Workbook reconciliation"],
    ["calendar", "Leasing & project calendar"],
    ["units", "Units & leasing"],
    ["monthly", "Monthly cash & funding"],
    ["finance", "Debt & borrowing capacity"],
    ["development", "Development & budgets"],
    ["expenses", "Expense schedules"],
    ["imports", "Workbook imports"],
    ["actuals", "Actuals & variance"],
    ["detail", "Detailed operating records"],
    ["returns", "Investors & tax scenario"],
    ["risk", "Stress & probabilities"],
    ["diligence", "Evidence & diligence"],
    ["sources", "Assumptions & sources"],
    ["decisions", "Decisions & case study"],
    ["portfolio", "Portfolio & backups"],
  ];
  for (const [id, title] of tools) {
    await page.goto(`/#monthly/maple-grove-shared/${id}`);
    await expect(
      page.getByRole("heading", { name: title, exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: /Opening|Loading/ }),
    ).toHaveCount(0);
    await settleMotion(page);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    violations.push(
      ...result.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => ({
          id,
          rule: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            detail: n.failureSummary,
          })),
        })),
    );
    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(dimensions.scroll, id).toBeLessThanOrEqual(dimensions.client);
  }
  expect(errors).toEqual([]);
  expect(violations).toEqual([]);
});

test("remaining quick and legal views are accessible and fit the viewport", async ({
  page,
}) => {
  test.setTimeout(60000);
  const issues: unknown[] = [];
  for (const route of [
    "#quick/cash",
    "#quick/debt",
    "#quick/refinance",
    "#quick/sellhold",
    "#quick/import",
    "#quick/report",
    "#quick/methodology",
    "#privacy",
    "#terms",
    "#disclaimer",
    "#contact",
  ]) {
    await page.goto("/" + route);
    await expect(page.locator("main:visible")).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: /Opening|Loading/ }),
    ).toHaveCount(0);
    await settleMotion(page);
    const a = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    issues.push(
      ...a.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => ({
          route,
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            detail: n.failureSummary,
          })),
        })),
    );
    const d = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(d.scroll, route).toBeLessThanOrEqual(d.client);
  }
  expect(issues).toEqual([]);
});
