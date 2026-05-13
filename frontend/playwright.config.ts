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

const e2ePort = Number(process.env.PLAYWRIGHT_PORT ?? 3002);
const baseURL = `http://localhost:${e2ePort}`;

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
    baseURL,
    trace: "retain-on-failure",
    launchOptions: {
      args: ["--no-proxy-server", "--proxy-bypass-list=<-loopback>;localhost;127.0.0.1"],
    },
  },
  webServer: {
    command: `npm run dev -- -p ${e2ePort}`,
    url: baseURL,
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
