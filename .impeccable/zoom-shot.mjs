// Capital recovery chart in the monthly report: full range, then zoomed twice.
import { chromium } from "@playwright/test";
const [, , out, width = "1280"] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(width), height: 900 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
await page.goto("http://localhost:5173/#monthly/maple-grove-shared/report");
const chart = page
  .locator(".financial-chart")
  .filter({ hasText: "Total owner distributions" })
  .first();
await chart.scrollIntoViewIfNeeded();
const slider = chart.locator('input[type="range"]');
await slider.fill("30");
await chart.screenshot({ path: `${out}/zoom-all-${width}.png` });
await chart.getByRole("button", { name: "Zoom in" }).click();
await chart.getByRole("button", { name: "Zoom in" }).click();
await page.waitForTimeout(400);
await chart.screenshot({ path: `${out}/zoom-in-${width}.png` });
console.log(
  width,
  await chart.locator(".chart-zoom-range").textContent(),
  "overflow",
  await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
);
await browser.close();
