import { test, expect } from "@playwright/test";

test("monthly planner remains readable with the EasyList sidebar filter", async ({
  page,
}, info) => {
  // Reproduce the cosmetic filter used by common ad blockers, without an extension.
  for (const width of [1920, 1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.addStyleTag({
      content: ".adv-sidebar { display: none !important; }",
    });
    await page
      .getByRole("button", { name: "Monthly planner", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Property overview", exact: true }),
    ).toBeVisible();

    const tools = page.getByRole("navigation", {
      name: "Property analysis tools",
    });
    await expect(tools).toBeVisible();
    const main = await page.locator("main").boundingBox();
    const navigation = await tools.boundingBox();
    expect(main).not.toBeNull();
    expect(navigation).not.toBeNull();
    if (width > 700) {
      expect(main!.x).toBeGreaterThanOrEqual(navigation!.x + navigation!.width);
      expect(main!.width).toBeGreaterThan(Math.min(width - 242, 1620) * 0.9);
    } else {
      expect(main!.y).toBeGreaterThan(navigation!.y + navigation!.height);
      expect(main!.width).toBeGreaterThanOrEqual(width - 24);
    }
    expect(
      await page
        .locator("h1")
        .evaluate((heading) => heading.getBoundingClientRect().height),
    ).toBeLessThan(90);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);

    await page.screenshot({
      path: info.outputPath(`monthly-adblock-${width}.png`),
    });
  }
});
