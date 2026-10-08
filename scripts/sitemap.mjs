import { writeFileSync } from "node:fs";
const raw = process.env.SITE_URL;
if (raw) {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("SITE_URL must use https or http.");
  const loc = url.origin + "/";
  writeFileSync(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${loc.replace(/&/g, "&amp;")}</loc></url></urlset>`,
  );
} else
  console.log(
    "SITE_URL is unset: sitemap omitted until a real deployment domain is known.",
  );
