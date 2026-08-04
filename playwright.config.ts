import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const authFile = ".playwright/auth/user.json";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      teardown: "cleanup",
    },
    {
      name: "cleanup",
      testMatch: /auth\.cleanup\.ts/,
      use: { storageState: authFile },
    },
    {
      name: "public-chromium",
      testMatch: /public-responsive\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "chromium-desktop",
      testMatch: /(app-responsive|phase-one|phase-two)\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: authFile, viewport: { width: 1280, height: 720 } },
    },
    {
      name: "chromium-mobile",
      testMatch: /app-responsive\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: authFile, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: "chromium-compact",
      testMatch: /app-responsive\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: authFile, viewport: { width: 320, height: 568 } },
    },
    {
      name: "webkit-tablet",
      testMatch: /app-responsive\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Safari"], storageState: authFile, viewport: { width: 768, height: 1024 } },
    },
    {
      name: "firefox-wide",
      testMatch: /app-responsive\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Firefox"], storageState: authFile, viewport: { width: 1440, height: 900 } },
    },
  ],
});
