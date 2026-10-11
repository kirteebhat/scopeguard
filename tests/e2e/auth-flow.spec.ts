import { test, expect } from "@playwright/test";

test.describe("Supabase Authentication & Route Protection Flow", () => {
  const uniqueId = Date.now();
  const testUser = {
    fullName: "Alex Rivera",
    workspaceName: `Agency Flow ${uniqueId}`,
    email: `e2e_alex_${uniqueId}@gmail.com`,
    password: "Password123!",
  };

  test("1. Unauthenticated visit to /dashboard redirects to /login?next=/dashboard", async ({
    page,
  }) => {
    // Attempt visiting protected dashboard directly while unauthenticated
    await page.goto("/dashboard");

    // Middleware should intercept and redirect to /login with next parameter
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
    await expect(
      page.getByRole("heading", { name: /sign in to your account/i })
    ).toBeVisible();
  });

  test("2. Full authentication cycle: sign up, session persistence, logout, login, and protected re-check", async ({
    page,
  }) => {
    const isMobile = (page.viewportSize()?.width ?? 1200) < 1024;

    // Step A: Visit signup page
    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: /create your agency workspace/i })
    ).toBeVisible();

    // Step B: Complete signup form
    await page.fill('input[name="fullName"]', testUser.fullName);
    await page.fill('input[name="workspaceName"]', testUser.workspaceName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    await page.click('button[type="submit"]');

    // Step C: Verify arrival on /dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();

    if (isMobile) {
      await page.click('button[aria-label="Open navigation menu"]');
    }
    const container = isMobile
      ? page.locator('div[role="dialog"]')
      : page.locator("aside");
    await expect(container.getByText(testUser.email)).toBeVisible();

    // Step D: Refresh while logged in and verify session persists
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();

    // Step E: Log out using the logout button
    if (isMobile) {
      await page.click('button[aria-label="Open navigation menu"]');
    }
    const logoutBtn = container.locator(
      'button[aria-label="Log out of application"]'
    );
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Step F: Verify redirection to /login
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: /sign in to your account/i })
    ).toBeVisible();

    // Step G: Attempt accessing /dashboard while logged out -> redirected to /login?next=/dashboard
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);

    // Step H: Log back in using credentials
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Step I: Verify redirected back to safe next path (/dashboard)
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
  });
});

