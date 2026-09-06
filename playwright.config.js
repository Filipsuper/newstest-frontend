import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3111",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/fixtures/news-backend.mjs",
      url: "http://127.0.0.1:8100/__newsroom_fixture",
      reuseExistingServer: false,
    },
    {
      command:
        process.env.PLAYWRIGHT_START_CMD ||
        "npm run dev -- --hostname 127.0.0.1 --port 3111",
      url: `${process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3111"}/designsystem`,
      env: { API_URL: "http://127.0.0.1:8100/api" },
      reuseExistingServer:
        Boolean(process.env.PLAYWRIGHT_BASE_URL) && !process.env.CI,
      timeout: 120000,
    },
  ],
});
