import { openMenus } from "./menu";
import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test("rent-roll loading feedback remains visible until parsing finishes and recovers from errors", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample" }).click();
  await openMenus(page);
  await page
    .getByRole("button", { name: "Rent roll import", exact: true })
    .click();
  let release!: () => void;
  const gate = new Promise<void>((done) => {
    release = done;
  });
  await page.route("**/import.worker-*.js", async (route) => {
    await gate;
    await route.continue();
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const upload = page.getByLabel("Upload rent roll");
  await upload.setInputFiles(resolve("public/samples/rent-roll.csv"));
  const loading = page.locator(".loading-feedback");
  await expect(loading).toContainText("Reading rent-roll.csv");
  await expect(loading.locator(".loading-skeleton")).toBeVisible();
  await expect(upload).toBeDisabled();
  expect(
    await loading
      .locator(".busy-icon")
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("none");
  release();
  await expect(loading).toBeHidden();
  await expect(upload).toBeEnabled();
  await expect(
    page.getByRole("button", { name: /Apply.*rent.roll|Apply to analysis/i }),
  ).toBeEnabled();
  await page.unroute("**/import.worker-*.js");
  await page.route("**/import.worker-*.js", (route) => route.abort());
  await upload.setInputFiles(resolve("public/samples/rent-roll.xlsx"));
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(loading).toBeHidden();
  await expect(upload).toBeEnabled();
});

test("chart download exposes progress, prevents duplicate exports and resolves design tokens", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample" }).click();
  const chart = page.locator(".financial-chart").filter({
    has: page.getByRole("heading", {
      name: "Capital recovery timeline",
      exact: true,
    }),
  });
  await expect(chart).toBeVisible();
  await page.evaluate(() => {
    const native = Image.prototype.decode;
    const state = window as unknown as { releaseImage: () => void };
    const gate = new Promise<void>((resolve) => {
      state.releaseImage = resolve;
    });
    Image.prototype.decode = async function () {
      await gate;
      return native.call(this);
    };
  });
  await chart.getByText("Download", { exact: true }).click();
  const download = page.waitForEvent("download");
  await chart.getByRole("button", { name: "PNG image", exact: true }).click();
  const pending = chart.getByRole("button", {
    name: "Preparing PNG…",
    exact: true,
  });
  await expect(pending).toBeDisabled();
  await expect(pending).toHaveAttribute("aria-busy", "true");
  await expect(
    chart.getByRole("button", { name: "SVG image", exact: true }),
  ).toBeDisabled();
  await expect(chart.locator("p[role=status]")).toContainText(
    "Preparing PNG download",
  );
  await page.evaluate(() =>
    (window as unknown as { releaseImage: () => void }).releaseImage(),
  );
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  await expect(
    chart.getByRole("button", { name: "PNG image", exact: true }),
  ).toBeEnabled();
  const svgDownload = page.waitForEvent("download");
  await chart.getByRole("button", { name: "SVG image", exact: true }).click();
  const svg = await svgDownload;
  const stream = await svg.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString();
  expect(text).not.toContain("var(--");
  expect(text).toContain("#0d1628");
  expect(text).toContain("fictional example");
});

test("shared white surfaces, component shapes and readable headings remain consistent", async ({
  page,
}, info) => {
  await page.goto("/");
  // Shapes and surfaces come from design tokens, not literals.
  const token = (name: string) =>
    page.evaluate(
      (n) =>
        getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
      name,
    );
  const composer = await page.locator(".iq-composer").evaluate((node) => ({
    background: getComputedStyle(node).backgroundColor,
    radius: getComputedStyle(node).borderTopLeftRadius,
  }));
  expect(composer.background).toBe("rgb(255, 255, 255)");
  // Hero radius on wide screens, panel radius on phones.
  expect([
    await token("--radius-hero"),
    await token("--radius-panel"),
  ]).toContain(composer.radius);
  // The start header is frosted glass where supported.
  expect(
    await page
      .locator(".iq-start-header")
      .evaluate(
        (node) =>
          getComputedStyle(node).backdropFilter !== "none" ||
          getComputedStyle(node).backgroundColor === "rgb(255, 255, 255)",
      ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("home.png"), fullPage: true });
  await page.getByRole("button", { name: "Try a sample" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Capital recovery timeline",
      exact: true,
    }),
  ).toBeVisible();
  const quick = await page
    .locator(".workspace-heading h1")
    .evaluate((node) => ({
      size: getComputedStyle(node).fontSize,
      weight: getComputedStyle(node).fontWeight,
    }));
  await page.screenshot({ path: info.outputPath("quick.png"), fullPage: true });
  await page
    .getByRole("button", { name: "Monthly planner", exact: true })
    .click();
  await expect(page.locator(".adv-heading h1")).toBeVisible();
  const monthly = await page.locator(".adv-heading h1").evaluate((node) => ({
    size: getComputedStyle(node).fontSize,
    weight: getComputedStyle(node).fontWeight,
  }));
  expect(monthly).toEqual(quick);
  expect(
    await page
      .locator(".adv-card")
      .first()
      .evaluate((node) => getComputedStyle(node).borderTopLeftRadius),
  ).toBe(await token("--radius-panel"));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("monthly.png"),
    fullPage: true,
  });
});
