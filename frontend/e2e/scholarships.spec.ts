import { expect, test } from "@playwright/test";

import { registerStudent } from "./helpers/auth";

test("scholarships list uses backend seed data", async ({ page }) => {
  await page.goto("/scholarships");

  await expect(page.getByText("Chinese Government Scholarship")).toBeVisible();
});

test("search filter updates scholarship results", async ({ page }) => {
  await page.goto("/scholarships");

  await page.getByLabel("Search scholarships").fill("China");
  await page.getByRole("button", { name: "Apply Filters" }).click();
  await expect(page.getByText("Chinese Government Scholarship")).toBeVisible();

  await page.getByLabel("Search scholarships").fill("definitely-no-result-xyz");
  await page.getByRole("button", { name: "Apply Filters" }).click();
  await expect(page.getByText("No published scholarships match these filters yet.")).toBeVisible();
});

test("country and checkbox filters do not block public browsing", async ({ page }) => {
  await page.goto("/scholarships");

  await page.getByLabel("Country").selectOption("China");
  await page.getByRole("button", { name: "Apply Filters" }).click();
  await expect(page.getByText("Chinese Government Scholarship")).toBeVisible();

  await page.getByLabel("Country").selectOption("Germany");
  await page.getByRole("button", { name: "Apply Filters" }).click();
  await expect(page.getByText("DAAD Scholarship")).toBeVisible();

  await page.getByLabel("No IELTS").check();
  await page.getByLabel("No application fee").check();
  await page.getByRole("button", { name: "Apply Filters" }).click();
  await expect(
    page.getByRole("heading", { name: "Scholarships for Pakistani Students" }),
  ).toBeVisible();
});

test("detail page shows important scholarship fields", async ({ page }) => {
  await page.goto("/scholarships/chinese-government-scholarship");

  await expect(page.getByRole("heading", { name: "Chinese Government Scholarship" })).toBeVisible();
  await expect(page.getByText("Country")).toBeVisible();
  await expect(page.getByText("Funding")).toBeVisible();
  await expect(page.getByText("Deadline")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Eligibility", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Required Documents" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How to Apply" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Official Link/i })).toBeVisible();
});

test("guest check eligibility sends user to registration", async ({ page }) => {
  await page.goto("/scholarships");
  await page.getByRole("link", { name: "Check Eligibility" }).first().click();

  await expect(page).toHaveURL(/\/register/);
});

test("logged-in check eligibility sends student to dashboard for now", async ({ page }) => {
  await registerStudent(page);
  await page.goto("/scholarships");
  await page.getByRole("link", { name: "Check Eligibility" }).first().click();

  await expect(page).toHaveURL(/\/dashboard/);
});
