import { expect, test } from "@playwright/test";

test("homepage loads for guest", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Scholars Republic").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Find the Right Scholarship for Your Profile" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Free Profile" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse Scholarships" })).toBeVisible();
});

test("public scholarships page loads for guest", async ({ page }) => {
  await page.goto("/scholarships");

  await expect(
    page.getByRole("heading", { name: "Scholarships for Pakistani Students" }),
  ).toBeVisible();
  await expect(page.getByText(/\d+ published scholarships?/)).toBeVisible();
  await expect(page.getByRole("link", { name: "View Details" }).first()).toBeVisible();
});

test("guest can open scholarship detail page", async ({ page }) => {
  await page.goto("/scholarships");

  const scholarshipCard = page
    .locator("article")
    .filter({ hasText: "Chinese Government Scholarship" });
  await expect(scholarshipCard).toBeVisible();
  await scholarshipCard.getByRole("link", { name: "View Details" }).click();

  await expect(page).toHaveURL(/\/scholarships\/.+/);
  await expect(page.getByRole("heading", { name: "Check your eligibility" })).toBeVisible();
  await expect(
    page.getByRole("complementary").getByRole("link", { name: "Create Free Profile" }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary").getByRole("link", { name: "Login", exact: true }),
  ).toBeVisible();
});

test("guest public navigation works", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Scholarships", exact: true }).click();
  await expect(page).toHaveURL(/\/scholarships/);

  await page.getByRole("link", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByRole("link", { name: "Create Free Profile", exact: true }).click();
  await expect(page).toHaveURL(/\/register/);
});
