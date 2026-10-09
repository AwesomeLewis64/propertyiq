// High-DPI crop of the header brand, for checking logo/wordmark alignment by eye.
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({
  deviceScaleFactor: 4,
  viewport: { width: 1280, height: 400 },
});
await page.goto("http://localhost:5173/");
await page
  .locator(".iq-start-header .brand")
  .screenshot({ path: process.argv[2] });
await browser.close();
