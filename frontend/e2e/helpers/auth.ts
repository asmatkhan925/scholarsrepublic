import { expect, type Page } from "@playwright/test";

export const E2E_PASSWORD = "StrongPassword123!";

export function uniqueEmail(prefix = "e2e_student") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
}

export async function registerStudent(page: Page, email = uniqueEmail()) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Student");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(E2E_PASSWORD);
  await page.getByLabel("Confirm password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Welcome, E2E Student")).toBeVisible();
  return { email, password: E2E_PASSWORD };
}

export async function loginStudent(page: Page, email: string, password = E2E_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
}

export async function createStrongStudentProfile(page: Page) {
  await page.evaluate(async () => {
    const token = window.localStorage.getItem("scholars_republic_access_token");
    if (!token) {
      throw new Error("Missing access token for E2E profile setup.");
    }

    const response = await fetch("http://localhost:8000/api/profile/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        city: "Lahore",
        province: "Punjab",
        domicile: "Punjab",
        nationality: "Pakistan",
        current_country: "Pakistan",
        current_education_level: "Bachelor",
        current_institution: "Punjab University",
        current_field_of_study: "Computer Science",
        target_degree_level: "Master",
        target_fields: ["Computer Science"],
        target_countries: ["China", "Taiwan"],
        funding_preference: "Fully Funded Only",
        application_fee_preference: "No Application Fee Only",
        grading_system: "CGPA_4",
        cgpa: "3.60",
        has_passport: true,
        has_transcript: true,
        has_degree: true,
        has_cv: true,
        has_study_plan: true,
        has_recommendation_letters: true,
        recommendation_letters_count: 2,
        english_proficiency_certificate: true,
        has_english_proficiency_letter: true,
        profile_data_consent: true,
      }),
    });

    if (!response.ok && response.status !== 400) {
      throw new Error(`Profile setup failed with status ${response.status}.`);
    }
  });
}
