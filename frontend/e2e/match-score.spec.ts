import { expect, test } from "@playwright/test";

import { createStrongStudentProfile, registerStudent } from "./helpers/auth";

test("guest does not see personalized match score", async ({ page }) => {
  await page.goto("/scholarships");

  await expect(
    page.getByText("Create a free profile to check your match score.").first(),
  ).toBeVisible();
  await expect(page.getByLabel(/Match score/i)).toHaveCount(0);
});

test("student without profile sees complete-profile CTA", async ({ page }) => {
  await registerStudent(page);
  await page.goto("/scholarships");

  await expect(
    page.getByText("Complete your profile to see personalized match scores.").first(),
  ).toBeVisible();
});

test("student with profile sees match score on scholarship list", async ({ page }) => {
  await registerStudent(page);
  await createStrongStudentProfile(page);
  await page.goto("/scholarships");

  await expect(page.getByLabel(/Match score/i).first()).toBeVisible();
  await expect(
    page.getByText(/Strong Match|Good Match|Moderate Match|Low Match/).first(),
  ).toBeVisible();
});

test("scholarship detail shows match panel for student with profile", async ({ page }) => {
  await registerStudent(page);
  await createStrongStudentProfile(page);
  await page.goto("/scholarships/chinese-government-scholarship");

  await expect(page.getByRole("heading", { name: "Your Match Score" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Match Breakdown" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Match Reasons" })).toBeVisible();
});

test("recommendations page is protected", async ({ page }) => {
  await page.goto("/dashboard/recommendations");

  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Frecommendations/);
});

test("recommendations page works for student with profile", async ({ page }) => {
  await registerStudent(page);
  await createStrongStudentProfile(page);
  await page.goto("/dashboard/recommendations");

  await expect(page.getByRole("heading", { name: "Recommended Scholarships" })).toBeVisible();
  await expect(page.getByText("Chinese Government Scholarship")).toBeVisible();
  await expect(page.getByLabel(/Match score/i).first()).toBeVisible();
});
