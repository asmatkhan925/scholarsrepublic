import { expect, test, type Page } from "@playwright/test";

import { registerStudent } from "./helpers/auth";

function scholarshipCard(page: Page, title: string) {
  return page.locator("article").filter({ hasText: title }).first();
}

test("guest cannot access saved dashboard", async ({ page }) => {
  await page.goto("/dashboard/saved");

  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fsaved/);
});

test("guest sees login save CTA on scholarships", async ({ page }) => {
  await page.goto("/scholarships");

  await expect(page.getByRole("link", { name: "Login to Save" }).first()).toBeVisible();
});

test("student can save from scholarship list", async ({ page }) => {
  await registerStudent(page);
  await page.goto("/scholarships");

  const card = scholarshipCard(page, "Chinese Government Scholarship");
  await card.getByRole("button", { name: /Save chinese-government-scholarship/i }).click();

  await expect(
    card.getByRole("button", { name: /Remove saved chinese-government-scholarship/i }),
  ).toBeVisible();
  await expect(card.getByText("Saved", { exact: true })).toBeVisible();
});

test("student can view saved dashboard", async ({ page }) => {
  await registerStudent(page);
  await page.goto("/scholarships/chinese-government-scholarship");
  await page.getByRole("button", { name: /Save chinese-government-scholarship/i }).click();

  await page.goto("/dashboard/saved");

  await expect(page.getByRole("heading", { name: "Saved Opportunities" })).toBeVisible();
  await expect(page.getByText("Chinese Government Scholarship")).toBeVisible();
});

test("student can unsave from saved dashboard", async ({ page }) => {
  await registerStudent(page);
  await page.goto("/scholarships/chinese-government-scholarship");
  await page.getByRole("button", { name: /Save chinese-government-scholarship/i }).click();

  await page.goto("/dashboard/saved");
  await page.getByRole("button", { name: "Remove Saved" }).click();

  await expect(page.getByText("You have not saved any opportunities yet.")).toBeVisible();
});

test("student can save from detail page", async ({ page }) => {
  await registerStudent(page);
  await page.goto("/scholarships/taiwan-icdf-scholarship");

  await page.getByRole("button", { name: /Save taiwan-icdf-scholarship/i }).click();

  await expect(
    page.getByRole("button", { name: /Remove saved taiwan-icdf-scholarship/i }),
  ).toBeVisible();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.goto("/dashboard/saved");
  await expect(page.getByText("Taiwan ICDF Scholarship")).toBeVisible();
});

test("saved state persists after reload", async ({ page }) => {
  await registerStudent(page);
  await page.goto("/scholarships/chinese-government-scholarship");
  await page.getByRole("button", { name: /Save chinese-government-scholarship/i }).click();
  await page.reload();

  await expect(
    page.getByRole("button", { name: /Remove saved chinese-government-scholarship/i }),
  ).toBeVisible();
});
