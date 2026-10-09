// Review captures: tool search for "noi", reconciliation uploads, summary verdict, scrolled planner.
import { chromium } from "@playwright/test";
const [, , out, width = "1280"] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(width), height: 900 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
});
await page.goto("http://localhost:5173/#monthly/maple-grove-shared/overview");
await page.getByLabel("Find a workspace tool").fill("noi");
await page
  .locator(".planner-sidebar")
  .screenshot({ path: `${out}/search-noi-${width}.png` });
await page.getByLabel("Find a workspace tool").fill("");
await page.goto(
  "http://localhost:5173/#monthly/maple-grove-shared/reconciliation",
);
const card = page
  .locator(".adv-card, section")
  .filter({ hasText: "Map workbook cells or columns" })
  .last();
await card.scrollIntoViewIfNeeded();
await card.screenshot({ path: `${out}/recon-${width}.png` });
await page.evaluate(() => scrollTo(0, 1600));
await page.screenshot({ path: `${out}/planner-scrolled-${width}.png` });
await page.goto("http://localhost:5173/#quick/overview");
await page
  .locator(".deal-summary")
  .screenshot({ path: `${out}/verdict-${width}.png` });
console.log(
  width,
  "overflow",
  await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
);
await browser.close();
