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
  await page.getByRole("button", { name: "Try with sample property" }).click();
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
  await page.getByRole("button", { name: "Try with sample property" }).click();
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
    await page
      .getByRole("button", { name: "Rent roll import", exact: true })
      .click();
    await page
      .getByLabel("Upload rent roll")
      .setInputFiles(resolve("public/samples", file));
    await page
      .getByRole("button", { name: /Apply.*rent.roll|Apply to analysis/i })
      .click();
    await page
      .getByRole("button", { name: "Investment overview", exact: true })
      .click();
    await expect(
      page.getByText("Current rent roll", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}
test("composer extraction and editable assumption defaults", async ({
  page,
}, info) => {
  await page.goto("/");
  await page
    .getByLabel("Paste deal details", { exact: true })
    .fill("$2.8M purchase; 20 units at $1,900/mo; 6.25% rate; 65% LTV");
  await expect(page.locator(".brief-preview")).toContainText("rent: 38,000");
  await page
    .getByRole("button", { name: "Analyze property", exact: true })
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
  await page.getByRole("button", { name: "More tools", exact: true }).click();
  await expect(page.locator(".planner-sidebar nav button")).toHaveCount(19);
  await page.getByText("Project actions", { exact: true }).click();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  const id = await page.getByLabel("Active local project").inputValue();
  await page
    .getByRole("button", { name: "Debt & borrowing capacity", exact: true })
    .click();
  const targetUrl = page.url();
  await expect(page).toHaveURL(new RegExp(`#monthly/${id}/finance$`));
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
  await expect(page.getByText(/Green: above/)).toBeVisible();
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
