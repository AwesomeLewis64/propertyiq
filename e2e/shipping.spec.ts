import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
async function quick(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Income-to-cash-flow bridge",
      exact: true,
    }),
  ).toBeVisible();
}
async function stable(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );
  });
}
test("chart keyboard inspection, supported downloads, disclosed data and hold alignment", async ({
  page,
}, info) => {
  await quick(page);
  const chart = page.locator(".financial-chart").filter({
    has: page.getByRole("heading", {
      name: "Capital recovery timeline",
      exact: true,
    }),
  });
  const range = chart.getByRole("slider");
  await range.focus();
  await range.press("End");
  await expect(chart.locator("output")).toContainText("Year 5");
  await range.press("Home");
  await expect(chart.locator("output")).toContainText("Year 0");
  await chart.getByText("View chart data", { exact: true }).click();
  await expect(chart.locator("tbody tr")).toHaveCount(6);
  await chart.getByText("Download", { exact: true }).click();
  for (const [kind, ext] of [
    ["CSV data", "csv"],
    ["SVG image", "svg"],
    ["PNG image", "png"],
  ]) {
    const event = page.waitForEvent("download");
    await chart.getByRole("button", { name: kind, exact: true }).click();
    const download = await event;
    expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${ext}$`));
    if (info.project.name === "desktop" || info.project.name === "mobile") {
      mkdirSync(resolve("docs/verification"), { recursive: true });
      await download.saveAs(
        resolve(
          `docs/verification/capital-recovery-${info.project.name}.${ext}`,
        ),
      );
    }
    const path = await download.path();
    expect(path).not.toBeNull();
    const bytes = readFileSync(path!);
    if (ext === "png")
      expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    else {
      expect(bytes.toString()).toContain("fictional example");
      expect(bytes.toString()).toContain("Net sale proceeds");
    }
  }
  if (info.project.name === "desktop" || info.project.name === "mobile") {
    await stable(page);
    mkdirSync(resolve("docs/screenshots"), { recursive: true });
    await chart.getByText("View chart data", { exact: true }).click();
    await chart.getByText("Download", { exact: true }).click();
    await chart.screenshot({
      path: resolve(
        `docs/screenshots/capital-recovery-${info.project.name}.png`,
      ),
    });
    const bridge = page.locator(".financial-chart").filter({
      has: page.getByRole("heading", {
        name: "Income-to-cash-flow bridge",
        exact: true,
      }),
    });
    await bridge.screenshot({
      path: resolve(
        `docs/screenshots/cash-flow-bridge-${info.project.name}.png`,
      ),
    });
    await chart.getByText("View chart data", { exact: true }).click();
  }
  const assumptions = page.locator(".mobile-assumptions");
  if (
    (await assumptions.isVisible()) &&
    (await assumptions.getAttribute("open")) === null
  )
    await assumptions.locator(":scope > summary").click();
  const section = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "Exit assumptions" }) })
    .last();
  if ((await section.getAttribute("open")) === null)
    await section.locator(":scope > summary").click();
  const hold = page.getByRole("combobox", { name: "Hold period", exact: true });
  await hold.selectOption("3");
  await expect(chart.locator("tbody tr")).toHaveCount(4);
  await range.focus();
  await range.press("End");
  await expect(chart.locator("output")).toContainText("Year 3");
  expect(await page.locator("body").innerText()).not.toMatch(
    /\bDemo\b|\bExperimental\b|\bBeta\b|cash-flow engine/i,
  );
});
test("quick provenance survives money editing, reload, portable restore and cancelled reset", async ({
  page,
}) => {
  await quick(page);
  const assumptions = page.locator(".mobile-assumptions");
  if (
    (await assumptions.isVisible()) &&
    (await assumptions.getAttribute("open")) === null
  )
    await assumptions.locator(":scope > summary").click();
  await page
    .getByLabel("Property name", { exact: true })
    .fill("Renamed example");
  const income = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "Income & growth" }) })
    .last();
  if ((await income.getAttribute("open")) === null)
    await income.locator(":scope > summary").click();
  await page
    .getByRole("textbox", { name: "Monthly rent per unit", exact: true })
    .fill("2,000");
  await page
    .getByRole("textbox", { name: "Monthly rent per unit", exact: true })
    .press("Tab");
  await expect(page.locator(".model-notice")).toContainText(
    "fictional example",
  );
  page.once("dialog", (d) => void d.dismiss());
  await page.getByRole("button", { name: "Reset to example" }).click();
  await expect(page.getByLabel("Property name", { exact: true })).toHaveValue(
    "Renamed example",
  );
  await page.getByRole("button", { name: "Save locally", exact: true }).click();
  await page.locator(".local-backup > summary").click();
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download Quick backup", exact: true })
    .click();
  const file = await event,
    path = await file.path();
  expect(
    JSON.parse(readFileSync(path!, "utf8")).analyses[0].assumptions.origin,
  ).toBe("example");
  await page
    .getByLabel("Restore Quick backup", { exact: true })
    .setInputFiles(path!);
  await expect(page.locator(".local-message")).toContainText(
    "Restored 1 snapshots",
  );
  await page.reload();
  await expect(page.locator(".model-notice")).toContainText(
    "fictional example",
  );
});
test("monthly money editing, stale stress, duplicate provenance and backup restoration", async ({
  page,
}) => {
  await page.goto("/#monthly/maple-grove-shared/overview");
  await page.getByText("Project actions", { exact: true }).click();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  const id = await page.getByLabel("Active local project").inputValue();
  const plot = page.locator(".financial-chart").filter({
    has: page.getByRole("heading", {
      name: "Ending cash and owner capital calls",
      exact: true,
    }),
  });
  await plot.getByText("Download", { exact: true }).click();
  const chartDownload = page.waitForEvent("download");
  await plot.getByRole("button", { name: "CSV data", exact: true }).click();
  expect(readFileSync((await (await chartDownload).path())!, "utf8")).toContain(
    "fictional example",
  );
  await page.locator(".iq-property-settings > summary").click();
  const field = page.getByLabel("Acquisition price", { exact: true });
  await expect(field).toHaveValue("$2,800,000.00");
  await field.fill("0");
  await field.press("Tab");
  await expect(field).toHaveValue("$0.00");
  await field.fill("");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Autosave paused: invalid draft")).toBeVisible();
  await expect(
    page
      .locator(".adv-metrics .metric")
      .filter({ has: page.locator("span", { hasText: /^Going-in cap rate$/ }) })
      .locator("strong"),
  ).toHaveText("N/A");
  await field.fill("2,800,000");
  await field.press("Tab");
  await page.goto(`/#monthly/${id}/risk`);
  await page.getByRole("button", { name: "Calculate combined stress" }).click();
  await page.getByLabel("Capital cost multiplier", { exact: true }).fill("1.3");
  await expect(
    page.getByText(
      "Inputs changed after this stress calculation. Recalculate to update these results.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Calculate combined stress" }).click();
  await expect(
    page.getByText(
      "Inputs changed after this stress calculation. Recalculate to update these results.",
    ),
  ).toHaveCount(0);
  await page.goto(`/#monthly/${id}/portfolio`);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download complete backup" }).click();
  const file = await event,
    path = await file.path();
  const backup = JSON.parse(readFileSync(path!, "utf8"));
  expect(backup.projects.find((p: { id: string }) => p.id === id).origin).toBe(
    "example",
  );
  await page.getByLabel("Restore workspace backup").setInputFiles(path!);
  await expect(
    page.getByText(/Restored 2 projects as new copies/),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Active local project").locator("option"),
  ).toHaveCount(4);
  await page.goto(`/#monthly/${id}/decisions`);
  await expect(
    page.getByRole("heading", {
      name: "Decisions, milestones and property case study",
      exact: true,
    }),
  ).toBeVisible();
});
test("actual PDF output for brief and ten-year tables", async ({
  page,
  browserName,
}, info) => {
  test.skip(
    browserName !== "chromium" || info.project.name !== "desktop",
    "PDF generation uses Chromium desktop; other engines are exercised in browser flows.",
  );
  await quick(page);
  await page
    .getByRole("button", { name: "Investment report", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Print / Save as PDF" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sensitivity tornado", exact: true }),
  ).toBeVisible();
  await stable(page);
  mkdirSync(resolve("docs/verification"), { recursive: true });
  await page.pdf({
    path: resolve("docs/verification/quick-investment-brief.pdf"),
    format: "A4",
    landscape: true,
    printBackground: true,
  });
  await page.goto("/#monthly/maple-grove-shared/overview");
  await page.locator(".iq-property-settings > summary").click();
  await page
    .getByLabel("Forecast months (12–120)", { exact: true })
    .fill("120");
  // The existing sample loan matures at month 60. Let the engine fund its balloon as documented.
  await page.goto("/#monthly/maple-grove-shared/report");
  await expect(page.locator(".iq-report")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sensitivity tornado", exact: true }),
  ).toBeVisible();
  await stable(page);
  await page.pdf({
    path: resolve("docs/verification/monthly-ten-year-brief.pdf"),
    format: "A4",
    landscape: true,
    printBackground: true,
  });
});
