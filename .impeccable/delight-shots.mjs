// Mid-animation captures: Analyze shine on hover and the IRR sparkle burst.
import { chromium } from "@playwright/test";
const [, , out, scheme = "light"] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: scheme,
});
await page.goto("http://localhost:5173/");
const analyze = page.locator(".iq-analyze");
await analyze.hover();
await page.waitForTimeout(260);
await analyze.screenshot({ path: `${out}/shine-${scheme}.png` });
await page.mouse.move(0, 0);
await page.getByRole("button", { name: "Try with sample property" }).click();
await page.locator(".accent-metric").waitFor();
await page.waitForTimeout(1080);
await page
  .locator(".accent-metric")
  .screenshot({ path: `${out}/sparkle-${scheme}.png` });
await page.waitForTimeout(2000);
console.log(
  scheme,
  "sparkle left after 3s:",
  await page.locator(".sparkle").count(),
);
await browser.close();
