# Cloudflare Pages deployment

Production: **https://propertyiq.pages.dev/**. Cloudflare Pages is connected to `LewisAdk/propertyiq`, with automatic deployments from `main`. The first public deployment succeeded on October 8, 2026.

Current settings: no framework preset, repository root, build command `pnpm install --frozen-lockfile && pnpm build`, output `dist`, `NODE_VERSION=22`, `PNPM_VERSION=11.25.0`, and `SITE_URL=https://propertyiq.pages.dev` in Production and Preview. No custom domain or paid services were added.

The public origin returns HTTP 200 with the expected CSP, `nosniff`, `no-referrer`, and camera/microphone/geolocation restrictions. Its sitemap uses the production HTTPS origin. All 91 distinct browser checks passed against production across Chromium, Firefox and WebKit on desktop and mobile. The first run recorded 90 passes, five intended PDF-only skips and one initial Decision Lab module response with an HTML MIME type; after deployment propagation, that script returned JavaScript and the affected import/Decision Lab check passed three consecutive repeats. No application changes were needed. The steps below document how to reproduce or maintain the deployment.

1. In Cloudflare, open Workers & Pages → Create application → Pages → Connect to Git. Connect the PropertyIQ GitHub repository and choose the branch containing this release.
2. Set the framework preset to Vite (or no preset with the settings below). Use Node.js 22. Build command: pnpm install --frozen-lockfile && pnpm build. Output directory: dist. Repository root: the directory containing package.json.
3. Set SITE_URL to the real HTTPS production origin, such as the Pages URL Cloudflare assigned, without a hash route. Rebuild after setting it; scripts/sitemap.mjs emits dist/sitemap.xml.
4. Review the Pages preview before promoting or sharing it. Complete the test suite locally first; connect GitHub Actions for ongoing checks.
5. Open the deployed home, Quick analysis, Monthly planner and Contact pages. Exercise CSV and XLSX import, save/load and exact project history. Data remains browser-local; another visitor cannot retrieve your projects merely from a URL.
6. In browser developer tools → Network → the main document → Response headers, verify Content-Security-Policy, X-Content-Type-Options: nosniff, Referrer-Policy: no-referrer, and the camera/microphone/geolocation restrictions.
7. Confirm that the CSP contains script-src 'self', connect-src 'self', worker-src 'self' blob:, object-src 'none', frame-ancestors 'none', and form-action 'none'. Open the console and confirm no blocked application resources. Imports must work without widening the script policy.
8. Verify sitemap.xml uses your actual origin and the public contact address is correct. Add the verified URL to README.md.

Cloudflare reads _headers from the build output and applies its headers to static asset responses; it does not serve that file as an asset. public/_headers is copied into dist by Vite. Local browser tests use scripts/preview.mjs to enforce the same header values. The production response headers were verified on October 8, 2026.

References: [Cloudflare React/static build guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/) and [Git integration guide](https://developers.cloudflare.com/pages/get-started/git-integration/) and [Pages headers documentation](https://developers.cloudflare.com/pages/configuration/headers/).
