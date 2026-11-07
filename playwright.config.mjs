import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: "list",
  timeout: 60_000,
  expect: { timeout: 7_500 },
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: isCI ? "retain-on-failure" : "off",
    ...devices["Desktop Chrome"]
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(isCI ? {} : { channel: "chrome" })
      }
    }
  ],
  webServer: [
    {
      command: "npm run dev:storefront -- --host 127.0.0.1",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !isCI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe"
    },
    {
      command: "npm run dev:admin -- --host 127.0.0.1",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: !isCI,
      timeout: 120_000,
      stdout: "ignore",
      stderr: "pipe"
    }
  ]
});
