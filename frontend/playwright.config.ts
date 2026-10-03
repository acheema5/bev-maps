import { defineConfig, devices } from "@playwright/test";

// One smoke test of the whole flow at iPhone size (`npm run test:e2e -w
// frontend`, after `npm run build`). Chromium, not WebKit: only Chromium can
// fake a camera. The iPhone preset is WebKit, so take its size, touch, and
// user agent and run them in Chromium.
const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } = devices["iPhone 15"];

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3210",
    browserName: "chromium",
    viewport,
    deviceScaleFactor,
    isMobile,
    hasTouch,
    userAgent,
    launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx next start -p 3210",
    url: "http://localhost:3210",
    reuseExistingServer: !process.env.CI,
  },
});
