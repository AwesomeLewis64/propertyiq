// Prints logo-center minus wordmark cap-center (px) per browser; ~0 means aligned.
import { chromium, firefox, webkit } from "@playwright/test";
for (const type of [chromium, firefox, webkit]) {
  let browser;
  try {
    browser = await type.launch();
  } catch {
    console.log(type.name(), "not installed");
    continue;
  }
  const page = await browser.newPage();
  await page.goto("http://localhost:5173/");
  await page.locator(".iq-brand-name").first().waitFor();
  console.log(
    type.name(),
    await page.evaluate(() => {
      const svg = document.querySelector(".iq-start-header .iq-brand-mark");
      const r = svg.getBoundingClientRect(),
        s = Math.min(r.width / 980, r.height / 870);
      const iconMid = r.top + (r.height - 870 * s) / 2 + 431 * s;
      const name = svg.parentElement.querySelector(".iq-brand-name");
      const range = document.createRange();
      range.selectNodeContents(name);
      const c = document.createElement("canvas").getContext("2d"),
        cs = getComputedStyle(name);
      c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = c.measureText("PIQ"),
        n = name.getBoundingClientRect();
      const trimmed = CSS.supports("text-box: trim-both cap alphabetic");
      // Untrimmed: baseline = box top + half-leading + font ascent, then shift by transform.
      const baseline = trimmed
        ? n.bottom
        : n.top +
          (n.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) /
            2 +
          m.fontBoundingBoxAscent;
      return {
        trimmed,
        diff: +(iconMid - (baseline - m.actualBoundingBoxAscent / 2)).toFixed(
          2,
        ),
      };
    }),
  );
  await browser.close();
}
