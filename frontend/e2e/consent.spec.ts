import { expect, test, type Page } from "@playwright/test";

const analyticsScriptSelector = 'script[src*="www.googletagmanager.com/gtag/js"]';
const adsenseScriptSelector =
  'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]';

async function stubOptionalTrackingScripts(page: Page) {
  await page.route("https://www.googletagmanager.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "",
    });
  });

  await page.route("https://pagead2.googlesyndication.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "",
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("optional tracking scripts stay disabled before consent and after decline", async ({ page }) => {
  await stubOptionalTrackingScripts(page);
  await page.goto("/");

  const consentDialog = page.getByRole("dialog", { name: "Cookie consent" });
  await expect(consentDialog).toBeVisible();
  await expect(page.locator(analyticsScriptSelector)).toHaveCount(0);
  await expect(page.locator(adsenseScriptSelector)).toHaveCount(0);

  await page.getByRole("button", { name: "Decline" }).click();

  await expect(consentDialog).toHaveCount(0);
  await expect(page.locator(analyticsScriptSelector)).toHaveCount(0);
  await expect(page.locator(adsenseScriptSelector)).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("sr_cookie_consent")))
    .toBe("declined");
});

test("accepting consent loads optional tracking scripts and persists the choice", async ({
  page,
  context,
}) => {
  await stubOptionalTrackingScripts(page);
  await page.goto("/");

  await expect(page.locator(analyticsScriptSelector)).toHaveCount(0);
  await expect(page.locator(adsenseScriptSelector)).toHaveCount(0);

  await page.getByRole("button", { name: "Accept" }).click();

  await expect(page.locator(analyticsScriptSelector)).toHaveCount(1);
  await expect(page.locator(adsenseScriptSelector)).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("sr_cookie_consent")))
    .toBe("accepted");

  const secondPage = await context.newPage();
  await stubOptionalTrackingScripts(secondPage);
  await secondPage.goto("/");

  await expect(secondPage.getByRole("dialog", { name: "Cookie consent" })).toHaveCount(0);
  await expect(secondPage.locator(analyticsScriptSelector)).toHaveCount(1);
  await expect(secondPage.locator(adsenseScriptSelector)).toHaveCount(1);

  await secondPage.close();
});
