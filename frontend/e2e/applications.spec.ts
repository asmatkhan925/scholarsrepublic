import { expect, test, type Page } from "@playwright/test";

import { registerStudent } from "./helpers/auth";

function applicationCard(page: Page, title: string) {
  return page.locator("article").filter({ hasText: title }).first();
}

async function saveChineseScholarship(page: Page) {
  await page.goto("/scholarships/chinese-government-scholarship");
  const saveButton = page.getByRole("button", {
    name: /Save chinese-government-scholarship/i,
  });
  if (await saveButton.isVisible()) {
    await saveButton.click();
    await expect(
      page.getByRole("button", {
        name: /Remove saved chinese-government-scholarship/i,
      }),
    ).toBeVisible();
  }
}

async function startChineseApplicationFromDetail(page: Page) {
  await page.goto("/scholarships/chinese-government-scholarship");
  await page
    .getByRole("button", { name: /Start tracking chinese-government-scholarship/i })
    .click();
  await expect(page.getByRole("button", { name: /View application for/i })).toBeVisible();
}

test("guest cannot access applications page", async ({ page }) => {
  await page.goto("/dashboard/applications");

  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fapplications/);
});

test("student can start application from saved page", async ({ page }) => {
  await registerStudent(page);
  await saveChineseScholarship(page);

  await page.goto("/dashboard/saved");
  await page
    .getByRole("button", { name: /Start tracking chinese-government-scholarship/i })
    .click();

  await expect(page).toHaveURL(/\/dashboard\/applications/);
  await expect(page.getByRole("heading", { name: "Application Tracker" })).toBeVisible();
  await expect(page.getByText("Chinese Government Scholarship")).toBeVisible();
});

test("student can start application from scholarship detail", async ({ page }) => {
  await registerStudent(page);

  await startChineseApplicationFromDetail(page);
  await page.goto("/dashboard/applications");

  await expect(page.getByText("Chinese Government Scholarship")).toBeVisible();
});

test("student can view application tracker", async ({ page }) => {
  await registerStudent(page);
  await startChineseApplicationFromDetail(page);

  await page.goto("/dashboard/applications");

  await expect(page.getByRole("heading", { name: "Application Tracker" })).toBeVisible();
  await expect(applicationCard(page, "Chinese Government Scholarship")).toBeVisible();
});

test("student can update application status", async ({ page }) => {
  await registerStudent(page);
  await startChineseApplicationFromDetail(page);
  await page.goto("/dashboard/applications");

  const card = applicationCard(page, "Chinese Government Scholarship");
  await card.getByLabel("Status").selectOption("applied");
  await card.getByRole("button", { name: "Save Changes" }).click();

  await expect(card.getByText("Application updated.")).toBeVisible();
  await expect(card.getByText("Applied").first()).toBeVisible();
});

test("student can update notes and next step", async ({ page }) => {
  await registerStudent(page);
  await startChineseApplicationFromDetail(page);
  await page.goto("/dashboard/applications");

  const card = applicationCard(page, "Chinese Government Scholarship");
  await card.getByLabel("Next step").fill("Prepare SOP");
  await card.getByLabel("Notes").fill("Need recommendation letters before submitting.");
  await card.getByRole("button", { name: "Save Changes" }).click();

  await expect(card.getByText("Application updated.")).toBeVisible();
  await page.reload();
  await expect(
    applicationCard(page, "Chinese Government Scholarship").getByLabel("Next step"),
  ).toHaveValue("Prepare SOP");
  await expect(
    applicationCard(page, "Chinese Government Scholarship").getByLabel("Notes"),
  ).toHaveValue("Need recommendation letters before submitting.");
});

test("student can delete application", async ({ page }) => {
  await registerStudent(page);
  await startChineseApplicationFromDetail(page);
  await page.goto("/dashboard/applications");

  const card = applicationCard(page, "Chinese Government Scholarship");
  await card.getByRole("button", { name: "Stop Tracking" }).click();

  await expect(page.getByText("You are not tracking any applications yet.")).toBeVisible();
});

test("application tracker does not require profile", async ({ page }) => {
  await registerStudent(page);

  await startChineseApplicationFromDetail(page);
  await page.goto("/dashboard/applications");

  await expect(page.getByText("Chinese Government Scholarship")).toBeVisible();
});
