import { expect, test } from "@playwright/test";

import { E2E_PASSWORD, logout, registerStudent, uniqueEmail } from "./helpers/auth";

test("register page form renders", async ({ page }) => {
  await page.goto("/register");

  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Confirm password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Register" })).toBeVisible();
});

test("register validation behavior shows password mismatch", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Mismatch Student");
  await page.getByLabel("Email address").fill(uniqueEmail("mismatch"));
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
  await page.getByLabel("Confirm password").fill("DifferentPassword123!");
  await page.getByRole("button", { name: "Register" }).click();

  await expect(page.getByText("Passwords do not match.")).toBeVisible();
});

test("student registration and logout work", async ({ page }) => {
  await registerStudent(page);
  await logout(page);

  await expect(page.getByRole("link", { name: "Create Free Profile" })).toBeVisible();
});

test("login works for a registered student", async ({ page }) => {
  const { email } = await registerStudent(page);
  await logout(page);

  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Welcome, E2E Student")).toBeVisible();
});

test("invalid login shows error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("missing@example.com");
  await page.getByLabel("Password").fill("WrongPassword123!");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});
