import { chromium } from "@playwright/test";
const out = process.argv[2];
const browser = await chromium.launch();
for (const scheme of ["light", "dark"])
  for (const [w, h, tag] of [[1440, 900, "desktop"], [390, 844, "mobile"]])
    for (const [route, name] of [["/", "home"], ["/#quick/overview", "quick"]]) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto("http://localhost:5173" + route);
      await page.locator("h1").first().waitFor();
      await page.waitForTimeout(800);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      await page.screenshot({ path: `${out}/${name}-${tag}-${scheme}.png`, fullPage: false });
      console.log(name, tag, scheme, "overflow", overflow);
      await page.close();
    }
await browser.close();
