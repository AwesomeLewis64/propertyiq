// Captures the first quick-analysis chart with the inspector at the last period.
import { chromium } from "@playwright/test";
const [, , out, width = "390", scheme = "light"] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(width), height: 900 },
  deviceScaleFactor: 2,
  colorScheme: scheme,
});
await page.goto("http://localhost:5173/#quick/overview");
const chart = page.locator(".financial-chart").first();
await chart.scrollIntoViewIfNeeded();
const slider = chart.locator('input[type="range"]');
await slider.focus();
await page.keyboard.press("End");
await page.waitForTimeout(900);
await chart.locator(".chart-canvas").screenshot({ path: out });
console.log(
  "overflow",
  await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
);
await browser.close();
