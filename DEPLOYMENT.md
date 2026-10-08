# Cloudflare Pages deployment

The source repository can stay private while the deployed website is public. No public deployment has been created in this release; a real URL cannot be populated until deployment succeeds.

1. In Cloudflare, open Workers & Pages → Create application → Pages → Connect to Git. Connect the PropertyIQ GitHub repository and choose the branch containing this release.
2. Set the framework preset to Vite (or no preset with the settings below). Use Node.js 22. Build command: pnpm install --frozen-lockfile && pnpm build. Output directory: dist. Repository root: the directory containing package.json.
3. Set SITE_URL to the real HTTPS production origin, such as the Pages URL Cloudflare assigned, without a hash route. Rebuild after setting it; scripts/sitemap.mjs emits dist/sitemap.xml.
4. Review the Pages preview before promoting or sharing it. Complete the test suite locally first; connect GitHub Actions for ongoing checks.
5. Open the deployed home, Quick analysis, Monthly planner and Contact pages. Exercise CSV and XLSX import, save/load and exact project history. Data remains browser-local; another visitor cannot retrieve your projects merely from a URL.
6. In browser developer tools → Network → the main document → Response headers, verify Content-Security-Policy, X-Content-Type-Options: nosniff, Referrer-Policy: no-referrer, and the camera/microphone/geolocation restrictions.
7. Confirm that the CSP contains script-src 'self', connect-src 'self', worker-src 'self' blob:, object-src 'none', frame-ancestors 'none', and form-action 'none'. Open the console and confirm no blocked application resources. Imports must work without widening the script policy.
8. Verify sitemap.xml uses your actual origin and the public contact address is correct. Add the verified URL to README.md.

Cloudflare reads _headers from the build output and applies its headers to static asset responses; it does not serve that file as an asset. public/_headers is copied into dist by Vite. Local browser tests use scripts/preview.mjs to enforce the same header values. Headers on a real deployment remain unverified until that deployment exists.

References: [Cloudflare React/static build guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/) and [Git integration guide](https://developers.cloudflare.com/pages/get-started/git-integration/) and [Pages headers documentation](https://developers.cloudflare.com/pages/configuration/headers/).
