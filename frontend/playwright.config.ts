import { defineConfig, devices } from "@playwright/test";

function withLocalhostNoProxy(value: string | undefined) {
  const existing = value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return Array.from(new Set([...existing, "127.0.0.1", "localhost"])).join(",");
}

process.env.NO_PROXY = withLocalhostNoProxy(process.env.NO_PROXY);
process.env.no_proxy = withLocalhostNoProxy(process.env.no_proxy);

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
