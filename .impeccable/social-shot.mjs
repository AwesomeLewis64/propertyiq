// LinkedIn/Open Graph preview: the start-page hero at 1200x630.
import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, colorScheme: "light", reducedMotion: "reduce" });
await page.goto("http://localhost:5173/");
await page.locator("h1").waitFor();
await page.waitForTimeout(600);
await page.screenshot({ path: process.argv[2] });
await browser.close();
