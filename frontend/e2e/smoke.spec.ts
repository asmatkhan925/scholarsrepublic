import { expect, test, type Page } from "@playwright/test";

const emptyListResponse = {
  count: 0,
  next: null,
  previous: null,
  results: [],
};

const scholarshipListItem = {
  id: 1,
  title: "Verified Test Scholarship",
  slug: "verified-test-scholarship",
  opportunity_type: "scholarship",
  status: "published",
  featured: false,
  verified_status: true,
  pathway_detail: null,
  application_track: "",
  department_name: "",
  lab_name: "",
  professor_name: "",
  provider_name: "Scholars Republic Test Source",
  organization_type: "",
  university_name: "Test University",
  company_name: "",
  country: "Pakistan",
  city: "",
  location_type: "on_site",
  short_description: "A mocked scholarship used only for browser smoke tests.",
  funding_type: "fully_funded",
  stipend_summary: "",
  degree_levels: ["Master"],
  fields_of_study: ["Computer Science"],
  eligible_countries: ["Pakistan"],
  deadline: "2026-12-31",
  is_rolling_deadline: false,
  application_fee_required: false,
  hec_required: false,
  ielts_required: false,
  english_proficiency_certificate_accepted: true,
  required_skills: [],
  employment_type: "",
  experience_level: "",
  tags: ["Smoke test"],
  is_expired: false,
  days_until_deadline: 180,
  published_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const scholarshipDetail = {
  ...scholarshipListItem,
  verification_note: "Verified from official source.",
  last_verified_at: "2026-01-01T00:00:00Z",
  description: "Detailed mocked scholarship overview.",
  benefits: "Full tuition and stipend.",
  eligibility: "Open to eligible students.",
  how_to_apply: "Apply through the official website.",
  official_link: "https://example.edu/scholarship",
  source_url: "https://example.edu/source",
  source_name: "Example University",
  target_regions: [],
  gender_eligibility: "all",
  min_cgpa: null,
  min_percentage: null,
  min_education_level: "",
  funding_amount: null,
  funding_currency: "",
  application_fee_amount: null,
  application_fee_currency: "",
  toefl_required: false,
  duolingo_required: false,
  hsk_required: false,
  min_experience_years: null,
  salary_min: null,
  salary_max: null,
  salary_currency: "",
  application_open_date: null,
  application_method: "online",
  required_documents: ["Transcript", "CV"],
  search_keywords: "",
  is_saved: false,
  saved_opportunity_id: null,
  is_tracking: false,
  application_id: null,
  created_at: "2026-01-01T00:00:00Z",
};

const scholarshipMatch = {
  score: 82,
  readiness_level: "High",
  breakdown: {
    eligibility: 20,
    degree_level: 15,
    field_fit: 15,
    country_preference: 10,
    funding_fee: 10,
    language_test: 10,
    academic_requirement: 7,
    document_readiness: 4,
    deadline_safety: 5,
  },
  matched_reasons: [
    "Pakistani students are eligible.",
    "Your target degree level matches this opportunity.",
    "Your target field matches this opportunity.",
  ],
  missing_requirements: ["Recommendation letter"],
  warnings: ["Confirm the final deadline on the official source."],
  suggestions: ["Prepare Recommendation letter before applying."],
};

const studentUser = {
  id: 7,
  email: "student@example.com",
  full_name: "E2E Student",
  role: "student",
  is_active: true,
  email_verified: true,
  date_joined: "2026-01-01T00:00:00Z",
};

async function mockStudentAuth(page: Page) {
  await page.addInitScript((user) => {
    window.localStorage.setItem("scholars_republic_access_token", "e2e-access-token");
    window.localStorage.setItem("scholars_republic_refresh_token", "e2e-refresh-token");
    window.localStorage.setItem("scholars_republic_user", JSON.stringify(user));
  }, studentUser);

  await page.route("**/api/auth/me/**", async (route) => {
    await route.fulfill({ json: studentUser });
  });

  await page.route("**/api/saved-opportunities/slugs/**", async (route) => {
    await route.fulfill({ json: { slugs: [], ids: [] } });
  });
}

async function mockScholarshipApi(
  page: Page,
  options: { delayScholarshipsMs?: number; recommendedMatch?: typeof scholarshipMatch } = {},
) {
  await page.route("**/api/reference/countries/**", async (route) => {
    await route.fulfill({
      json: { regions: { Asia: ["Pakistan"] } },
    });
  });

  await page.route("**/api/reference/study-fields/**", async (route) => {
    await route.fulfill({
      json: { categories: { STEM: ["Computer Science"] } },
    });
  });

  await page.route("**/api/opportunity-pathways/**", async (route) => {
    await route.fulfill({ json: emptyListResponse });
  });

  await page.route("**/api/scholarships/**", async (route) => {
    const url = route.request().url();

    if (url.includes("/recommended/") && options.recommendedMatch) {
      await route.fulfill({
        json: {
          count: 1,
          results: [{ opportunity: scholarshipListItem, match: options.recommendedMatch }],
        },
      });
      return;
    }

    if (url.includes("/verified-test-scholarship/comments/")) {
      await route.fulfill({ json: { count: 0, results: [] } });
      return;
    }

    if (url.includes("/verified-test-scholarship/")) {
      await route.fulfill({ json: scholarshipDetail });
      return;
    }

    if (options.delayScholarshipsMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayScholarshipsMs));
    }

    await route.fulfill({
      json: {
        count: 1,
        next: null,
        previous: null,
        results: [scholarshipListItem],
      },
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test("home page loads", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Scholars Republic").first()).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Your scholarship search, profile, documents, and applications/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse Scholarships" }).first()).toBeVisible();
});

test("scholarships page renders heading without placeholder zero stats", async ({ page }) => {
  await mockScholarshipApi(page, { delayScholarshipsMs: 1_000 });

  await page.goto("/scholarships");

  await expect(
    page.getByRole("heading", { name: "Find scholarships worth applying to." }),
  ).toBeVisible();

  const initialMainText = await page.locator("main").innerText();
  expect(initialMainText).not.toContain("Results\n0\nPublished scholarships");
  expect(initialMainText).not.toContain("Urgent\n0\nDue within 14 days");

  await expect(page.getByRole("heading", { name: "Verified Test Scholarship" })).toBeVisible();
  await expect(page.getByText("1 opportunity found")).toBeVisible();
});

test("scholarship match badge opens profile match modal", async ({ page }) => {
  await mockStudentAuth(page);
  await mockScholarshipApi(page, { recommendedMatch: scholarshipMatch });

  await page.goto("/scholarships");

  const matchBadge = page.getByRole("button", { name: /82% match/i });
  await expect(matchBadge).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Profile match" })).toHaveCount(0);

  await matchBadge.click();

  await expect(page.getByRole("dialog", { name: "Profile match" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Profile match" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Verified Test Scholarship" })).toBeVisible();
  await expect(page.getByText("A mocked scholarship used only for browser smoke tests.")).toBeVisible();
  await expect(page.getByText("Why this matches")).toBeVisible();
  await expect(page.getByText("Your target degree level matches this opportunity.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Update profile" })).toHaveAttribute(
    "href",
    "/dashboard/profile",
  );

  await page.getByRole("button", { name: "Close match details" }).click();
  await expect(page.getByRole("dialog", { name: "Profile match" })).toHaveCount(0);
});

test("login page renders auth fields and query notices", async ({ page }) => {
  await page.goto("/login?registered=1&email=test@example.com");

  await expect(page.getByLabel("Email address")).toHaveValue("test@example.com");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Show password" })).toBeVisible();
  await expect(page.getByText("Account created. Please check your email")).toBeVisible();

  await page.goto("/login?verified=1&email=test@example.com");

  await expect(page.getByLabel("Email address")).toHaveValue("test@example.com");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(
    page.getByText("Email verified successfully. Please enter your password to continue."),
  ).toBeVisible();

  await page.goto("/login?reset=1");

  await expect(page.getByLabel("Email address")).toHaveValue("");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(
    page.getByText("Password reset successfully. Please log in with your new password."),
  ).toBeVisible();
});

test("register page loads required fields", async ({ page }) => {
  await page.goto("/register");

  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Confirm password")).toBeVisible();
});

test("forgot password page uses generic security copy", async ({ page }) => {
  await page.goto("/forgot-password");

  await expect(page.getByRole("heading", { name: "Reset Password" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(
    page.getByText("For security, we cannot confirm whether an email is registered."),
  ).toBeVisible();
});

test("reset password page handles missing uid and token safely", async ({ page }) => {
  await page.goto("/reset-password");

  await expect(page.getByText("Password reset link is missing required data.")).toBeVisible();
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Confirm new password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset password" })).toBeDisabled();
});

test("verify email page shows invalid-link message before redirecting", async ({ page }) => {
  await page.goto("/verify-email");

  await expect(page.getByText("This verification link is missing required information.")).toBeVisible();
  await expect(page.getByText("Redirecting you to registration...")).toBeVisible();
  await expect(page).toHaveURL(/\/register/, { timeout: 5_000 });
});

test("scholarship detail page handles missing scholarship safely", async ({ page }) => {
  await page.goto("/scholarships/e2e-missing-scholarship");

  await expect(
    page.getByText(/404|This page could not be found|Scholarship not found/i).first(),
  ).toBeVisible();
  await expect(page.getByText("Verified Test Scholarship")).toHaveCount(0);
});
