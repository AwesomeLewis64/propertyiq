// Phase B/C review captures: story card and deal summary, desktop + 390, light + dark.
import { chromium } from "@playwright/test";
const out = process.argv[2];
const browser = await chromium.launch();
for (const scheme of ["light", "dark"])
  for (const [w, tag] of [
    [1440, "desktop"],
    [390, "mobile"],
  ]) {
    const page = await browser.newPage({
      viewport: { width: w, height: 900 },
      colorScheme: scheme,
      reducedMotion: "reduce",
    });
    await page.goto("http://localhost:5173/");
    await page.locator("#how-it-works").scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollBy(0, innerHeight * 0.6));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/story-${tag}-${scheme}.png` });
    await page.goto("http://localhost:5173/#quick/overview");
    await page.locator(".deal-summary").waitFor();
    await page.evaluate(() => scrollBy(0, 700));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/summary-${tag}-${scheme}.png` });
    console.log(
      tag,
      scheme,
      "overflow",
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    );
    await page.close();
  }
await browser.close();
