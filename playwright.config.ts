import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests on two phone profiles:
 *  - android: Chromium (the engine of Chrome on Android), Pixel 7 screen and touch
 *  - iphone:  WebKit (the engine of Safari on iOS), iPhone 14 screen and touch
 * `PW_CHROME_CHANNEL=chrome` runs the android profile with an installed Google Chrome
 * instead of the Playwright Chromium build.
 */
const chromeChannel = process.env.PW_CHROME_CHANNEL;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  webServer: {
    command: "npx vite build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "android", use: { ...devices["Pixel 7"], ...(chromeChannel ? { channel: chromeChannel } : {}) } },
    { name: "iphone", use: { ...devices["iPhone 14"] } },
  ],
});
