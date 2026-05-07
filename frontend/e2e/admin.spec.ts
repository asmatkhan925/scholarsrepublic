import { expect, test } from "@playwright/test";

import { E2E_PASSWORD, registerStudent } from "./helpers/auth";

test("guest cannot access admin", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
});

test("student cannot access admin", async ({ page }) => {
  await registerStudent(page);
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
});

test("admin can access admin placeholder when credentials are provided", async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD ?? E2E_PASSWORD;

  test.skip(!email, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin login E2E.");

  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
});
