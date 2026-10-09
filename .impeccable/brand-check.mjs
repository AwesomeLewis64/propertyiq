// Measures rendered ink: logo center vs wordmark center (cap tops to p/y descenders), in CSS px.
import { chromium, firefox, webkit } from "@playwright/test";
const scale = 4;
for (const type of [chromium, firefox, webkit]) {
  const browser = await type.launch();
  const page = await browser.newPage({ deviceScaleFactor: scale });
  await page.goto("http://localhost:5173/");
  const brand = page.locator(".iq-start-header .brand");
  await brand.waitFor();
  const png = (await brand.screenshot()).toString("base64");
  const split = await page.evaluate(() => {
    const b = document
      .querySelector(".iq-start-header .brand")
      .getBoundingClientRect();
    return (
      document
        .querySelector(".iq-start-header .iq-brand-name")
        .getBoundingClientRect().left - b.left
    );
  });
  const result = await page.evaluate(
    async ({ png, split, scale }) => {
      const img = new Image();
      img.src = "data:image/png;base64," + png;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const bg = [d[0], d[1], d[2]];
      const bounds = (x0, x1) => {
        let top = Infinity,
          bottom = -1;
        for (let y = 0; y < c.height; y++)
          for (let x = x0; x < x1; x++) {
            const i = (y * c.width + x) * 4;
            if (
              Math.abs(d[i] - bg[0]) +
                Math.abs(d[i + 1] - bg[1]) +
                Math.abs(d[i + 2] - bg[2]) >
              120
            ) {
              top = Math.min(top, y);
              bottom = Math.max(bottom, y);
            }
          }
        return {
          top: top / scale,
          bottom: bottom / scale,
          mid: (top + bottom) / 2 / scale,
        };
      };
      const logo = bounds(0, Math.floor(split * scale) - 4);
      const text = bounds(Math.ceil(split * scale), c.width);
      return { logo, text, diff: +(logo.mid - text.mid).toFixed(2) };
    },
    { png, split, scale },
  );
  console.log(type.name(), JSON.stringify(result));
  await browser.close();
}
