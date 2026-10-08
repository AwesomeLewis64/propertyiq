import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
test("monthly CSV/XLSX imports preserve their sources and all decision subtools open", async ({
  page,
}) => {
  await page.goto("/#monthly/maple-grove-shared/imports");
  for (const name of [
    "advanced-units.csv",
    "advanced-fictional-workbook.xlsx",
  ]) {
    await page
      .getByLabel("Advanced spreadsheet upload")
      .setInputFiles(resolve("public/samples", name));
    await expect(
      page.getByRole("button", { name: "Apply mapped worksheet", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Apply mapped worksheet", exact: true })
      .click();
    await expect(
      page.getByText(/Applied mapped rows\. Source file is attached/),
    ).toBeVisible();
  }
  await page.goto("/#monthly/maple-grove-shared/decisionlab");
  for (const name of [
    "Base / downside / upside",
    "Renovation prioritization",
    "Lender quote comparison",
    "Break-even dashboard",
  ]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.getByRole("tab", { name, exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }
  await page.goto("/#monthly/maple-grove-shared/decisions");
  await page.getByLabel("Decision records view").selectOption("case");
  await expect(
    page.getByRole("heading", {
      name: "Property case-study template",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Case-study title")).toHaveValue(
    "Property case study",
  );
  const priceRow = page.locator("details").filter({
    has: page.locator("summary", { hasText: "Edit Purchase price" }),
  });
  await priceRow.locator(":scope > summary").click();
  const actual = priceRow.getByLabel("Recorded actual value", { exact: true });
  await expect(actual).toHaveValue("");
  await actual.fill("1,250,000");
  await actual.press("Tab");
  await expect(actual).toHaveValue("$1,250,000.00");
  await actual.fill("0");
  await actual.press("Tab");
  await expect(actual).toHaveValue("$0.00");
  await actual.fill("");
  await expect(actual).toHaveValue("");
  expect(await page.locator("body").innerText()).not.toMatch(/EXPERIMENTAL/);
  await page.reload();
  await page.getByLabel("Decision records view").selectOption("case");
  await expect(page.getByLabel("Case-study title")).toHaveValue(
    "Property case study",
  );
});
test("evidence files survive portable backup restoration to new IDs", async ({
  page,
}) => {
  await page.goto("/#monthly/maple-grove-shared/diligence");
  await page.getByRole("button", { name: "Add evidence", exact: true }).click();
  const record = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "New evidence" }) })
    .last();
  if ((await record.getAttribute("open")) === null)
    await record.locator(":scope > summary").click();
  const content = "Fictional source for portable-backup verification.\n";
  await page.getByLabel("Attach evidence for New evidence").setInputFiles({
    name: "fictional-evidence.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(content),
  });
  await expect(
    page.getByRole("button", { name: "Download attached source" }),
  ).toBeVisible();
  await page.goto("/#monthly/maple-grove-shared/portfolio");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download complete backup" }).click();
  const file = await event,
    path = await file.path();
  const data = JSON.parse(readFileSync(path!, "utf8"));
  expect(data.attachments).toHaveLength(1);
  expect(Buffer.from(data.attachments[0].base64, "base64").toString()).toBe(
    content,
  );
  await page.getByLabel("Restore workspace backup").setInputFiles(path!);
  await expect(
    page.getByText(/Restored 1 projects as new copies/),
  ).toBeVisible();
  const restored = await page
    .getByLabel("Active local project")
    .locator("option")
    .last()
    .getAttribute("value");
  await page.goto(`/#monthly/${restored}/diligence`);
  const copy = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "New evidence" }) })
    .last();
  if ((await copy.getAttribute("open")) === null)
    await copy.locator(":scope > summary").click();
  const attachment = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download attached source" }).click();
  const output = await attachment;
  expect(readFileSync((await output.path())!, "utf8")).toBe(content);
  await page.goto(`/#monthly/${restored}/portfolio`);
  const incomplete = { ...data, attachments: [] };
  await page.getByLabel("Restore workspace backup").setInputFiles({
    name: "incomplete.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(incomplete)),
  });
  await expect(
    page.getByText(/Backup is missing a referenced evidence file/),
  ).toBeVisible();
  await expect(
    page.getByLabel("Active local project").locator("option"),
  ).toHaveCount(2);
});
test("actuals and negative historical money inputs distinguish blanks and valid zero", async ({
  page,
}) => {
  await page.goto("/#monthly/maple-grove-shared/actuals");
  await expect(
    page.getByText("No actual periods recorded.", { exact: false }),
  ).toBeVisible();
  await expect(
    page
      .locator(".metric")
      .filter({ hasText: "Latest up-to-12-period NOI" })
      .locator("strong"),
  ).toHaveText("N/A");
  await page
    .getByRole("button", { name: "Add first forecast month actuals" })
    .click();
  const actual = page
    .locator("details.adv-details")
    .filter({ has: page.locator("summary", { hasText: /2026-10.*NOI/ }) })
    .first();
  await actual.locator(":scope > summary").click();
  const inputs = actual.locator('input[inputmode="decimal"]');
  expect(await inputs.count()).toBe(5);
  for (const input of await inputs.all()) {
    await expect(input).toHaveValue("");
    await input.fill("0");
    await input.press("Tab");
    await expect(input).toHaveValue("$0.00");
  }
  await expect(page.getByText("Autosave paused: invalid draft")).toHaveCount(0);
  await page.goto("/#monthly/maple-grove-shared/returns");
  await page.getByRole("button", { name: "Add historical flow" }).click();
  const amount = page.getByLabel("Signed amount (contribution negative)", {
    exact: true,
  });
  await amount.fill("-250,000.50");
  await amount.press("Tab");
  await expect(amount).toHaveValue("-$250,000.50");
});
