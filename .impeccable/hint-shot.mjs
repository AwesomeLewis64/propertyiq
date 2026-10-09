// 390px capture of the composer with the longest rotating hint showing.
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
await page.goto("http://localhost:5173/");
for (let i = 0; i < 3; i++) {
  await page.locator(".iq-composer").hover();
  await page.locator("h1").hover();
}
await page.waitForTimeout(600);
await page.locator(".iq-composer").screenshot({ path: process.argv[2] });
console.log(
  "overflow",
  await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
);
await browser.close();
