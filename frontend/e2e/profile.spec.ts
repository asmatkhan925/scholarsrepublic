import { expect, test } from "@playwright/test";

import { registerStudent } from "./helpers/auth";

test("guest cannot access profile", async ({ page }) => {
  await page.goto("/dashboard/profile");

  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fprofile/);
});

test("student can access profile page and sections render", async ({ page }) => {
  await registerStudent(page);
  await page.goto("/dashboard/profile");

  await expect(page.getByRole("heading", { name: "Scholarship Readiness Profile" })).toBeVisible();
  for (const section of [
    "Basic Information",
    "Current Education",
    "Target Study Plan",
    "Tests and Language",
    "Documents",
    "Research, Skills, and Career",
    "Financial Preferences and Special Categories",
    "Alerts and Consent",
  ]) {
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
  }
});

test("profile dropdowns, checkboxes, multi-selects, save, and persistence work", async ({
  page,
}) => {
  await registerStudent(page);
  await page.goto("/dashboard/profile");

  await page.getByLabel("City").fill("Lahore");
  await page.getByLabel("Province", { exact: true }).selectOption("Punjab");
  await page.getByLabel("Current education level").selectOption("Bachelor");
  await page.getByLabel("Current institution").fill("Punjab University");
  await page.getByLabel("Current field of study").fill("Computer Science");
  await page.getByLabel("Grading system").selectOption("CGPA_4");
  await page.getByLabel("CGPA").fill("3.5");
  await page.getByLabel("Target degree level").selectOption("Master");
  await page.getByLabel("Funding preference").selectOption("Fully Funded Only");
  await page.getByLabel("Preferred intake").fill("Fall 2026");

  await page.getByLabel("Passport ready").check();
  await page.getByLabel("CV ready").check();
  await page.getByLabel("Transcript ready").check();
  await page.getByLabel("I have IELTS").check();
  await page.getByLabel("IELTS score").fill("7.0");
  await page
    .getByLabel(
      "I agree that my profile data can be used for scholarship recommendations inside Scholars Republic",
    )
    .check();

  await page.getByLabel("China", { exact: true }).check();
  await page.getByLabel("Taiwan", { exact: true }).check();
  await page.getByLabel("Computer Science", { exact: true }).check();
  await page.getByLabel("Data Science", { exact: true }).check();
  await page.getByLabel("Research", { exact: true }).check();

  await page.getByRole("button", { name: "Save Profile" }).click();
  await expect(page.getByText("Profile saved successfully.")).toBeVisible();
  await expect(page.getByText(/Profile completion/i)).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("City")).toHaveValue("Lahore");
  await expect(page.getByLabel("Province", { exact: true })).toHaveValue("Punjab");
  await expect(page.getByLabel("Passport ready")).toBeChecked();
  await expect(page.getByLabel("China", { exact: true })).toBeChecked();

  await page.goto("/dashboard");
  await expect(page.getByText("Profile completion")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Scholarship readiness" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Update Profile" })).toBeVisible();
});

test("profile validation displays invalid percentage and IELTS errors", async ({ page }) => {
  await registerStudent(page);
  await page.goto("/dashboard/profile");

  await page.getByLabel("Grading system").selectOption("Percentage");
  await page.getByLabel("Percentage", { exact: true }).fill("150");
  await page.getByRole("button", { name: "Save Profile" }).click();
  await expect(page.getByText("Must be between 0 and 100.")).toBeVisible();

  await page.getByLabel("Percentage", { exact: true }).fill("80");
  await page.getByLabel("I have IELTS").check();
  await page.getByLabel("IELTS score").fill("10");
  await page.getByRole("button", { name: "Save Profile" }).click();
  await expect(page.getByText("Must be between 0 and 9.")).toBeVisible();
});
