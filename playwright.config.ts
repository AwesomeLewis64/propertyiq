import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4197",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "firefox-desktop",
      use: { browserName: "firefox", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "firefox-mobile",
      use: { browserName: "firefox", viewport: { width: 390, height: 844 } },
    },
    {
      name: "webkit-desktop",
      use: { browserName: "webkit", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "webkit-mobile",
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: "node scripts/preview.mjs",
    url: "http://127.0.0.1:4197",
    reuseExistingServer: false,
  },
});
