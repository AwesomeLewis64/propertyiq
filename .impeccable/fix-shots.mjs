// Captures the closing card and a chart panel's edges, desktop + 390, dark.
import { chromium } from "@playwright/test";
const out = process.argv[2];
const browser = await chromium.launch();
for (const [w, tag] of [
  [1440, "desktop"],
  [390, "mobile"],
]) {
  const page = await browser.newPage({
    viewport: { width: w, height: 900 },
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  await page.goto("http://localhost:5173/");
  await page.locator(".iq-return").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/return-${tag}.png` });
  await page.goto("http://localhost:5173/#quick/overview");
  const chart = page.locator(".financial-chart").nth(1);
  await chart.scrollIntoViewIfNeeded();
  await chart.screenshot({ path: `${out}/chartpanel-${tag}.png` });
  await page
    .locator(".exit-panel")
    .screenshot({ path: `${out}/exitpanel-${tag}.png` });
  console.log(
    tag,
    "overflow",
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  );
  await page.close();
}
await browser.close();
