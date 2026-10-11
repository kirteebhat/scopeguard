import { test, expect } from "@playwright/test";

test.describe("Multi-Tenant Isolation & Workspace Management", () => {
  test("1. Multi-tenant isolation: Second user cannot see first user's workspace or team members", async ({
    page,
  }) => {
    test.setTimeout(90000);
    const randA = Math.random().toString(36).slice(2, 7);
    const timestampA = `${Date.now()}_${randA}`;
    const userA = {
      fullName: "Alpha Founder",
      workspaceName: `Agency Alpha ${timestampA}`,
      email: `alpha_${timestampA}@example.com`,
      password: "Password123!",
    };

    const randB = Math.random().toString(36).slice(2, 7);
    const timestampB = `${Date.now()}_${randB}`;
    const userB = {
      fullName: "Beta Founder",
      workspaceName: `Agency Beta ${timestampB}`,
      email: `beta_${timestampB}@example.com`,
      password: "Password123!",
    };

    // --- STEP A: User A signs up with Workspace A ---
    await page.goto("/signup");
    await page.fill('input[name="fullName"]', userA.fullName);
    await page.fill('input[name="workspaceName"]', userA.workspaceName);
    await page.fill('input[name="email"]', userA.email);
    await page.fill('input[name="password"]', userA.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify User A sees Workspace A in settings
    await page.goto("/settings");
    await expect(page.locator("#workspaceNameInput")).toHaveValue(userA.workspaceName);

    // Verify User A team list shows only User A
    await page.goto("/settings/team");
    await expect(page.locator("tbody").getByText(userA.email)).toBeVisible();
    await expect(page.locator("tbody").getByText(userB.email)).not.toBeVisible();

    // --- STEP B: Log out User A ---
    const isMobile = (page.viewportSize()?.width ?? 1200) < 1024;
    if (isMobile) {
      await page.click('button[aria-label="Open navigation menu"]');
    }
    const containerA = isMobile ? page.locator('div[role="dialog"]') : page.locator("aside");
    await containerA.locator('button[aria-label="Log out of application"]').click();
    await page.waitForURL(/\/login/, { timeout: 10000 });

    // --- STEP C: User B signs up with Workspace B ---
    await page.goto("/signup");
    await page.fill('input[name="fullName"]', userB.fullName);
    await page.fill('input[name="workspaceName"]', userB.workspaceName);
    await page.fill('input[name="email"]', userB.email);
    await page.fill('input[name="password"]', userB.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);

    // --- STEP D: Verify User B cannot see Workspace A ---
    await page.goto("/settings");
    await expect(page.locator("#workspaceNameInput")).toHaveValue(userB.workspaceName);
    await expect(page.locator("#workspaceNameInput")).not.toHaveValue(userA.workspaceName);
    await expect(page.getByText(userA.workspaceName)).not.toBeVisible();

    // --- STEP E: Verify User B cannot see User A in team members ---
    await page.goto("/settings/team");
    await expect(page.locator("tbody").getByText(userB.email)).toBeVisible();
    await expect(page.locator("tbody").getByText(userA.email)).not.toBeVisible();

    // --- STEP F: Verify Honest plain text notices (no fake features) ---
    // In /settings: Display-only plan metadata note
    await page.goto("/settings");
    await expect(
      page.getByText(/no payment gateway or billing connection is active in this release/i)
    ).toBeVisible();

    // In /settings/team: Invitations coming later note
    await page.goto("/settings/team");
    await expect(
      page.getByText(/team invitations are coming in a future release/i)
    ).toBeVisible();

    // --- STEP G: Workspace owner can rename workspace via settings ---
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    const updatedName = `Agency Beta Renamed ${timestampB}`;
    await page.locator("#workspaceNameInput").fill(updatedName);
    await page.click('button:has-text("Save Changes")');

    await expect(
      page.getByText(/workspace details updated successfully/i)
    ).toBeVisible({ timeout: 30000 });

    // Refresh and ensure persisted
    await page.reload();
    await expect(page.locator("#workspaceNameInput")).toHaveValue(updatedName);

    // --- STEP H: User with active workspace visiting /onboarding is redirected to /dashboard ---
    await page.goto("/onboarding");
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("2. User logging in with no workspace is routed to /onboarding and creates workspace", async ({
    page,
  }) => {
    const randC = Math.random().toString(36).slice(2, 7);
    const timestampC = `${Date.now()}_${randC}`;
    const userC = {
      email: `onboarding_${timestampC}@example.com`,
      password: "Password123!",
      workspaceName: `Gamma Studios ${timestampC}`,
    };

    // Sign up without workspace (or directly navigate to login after admin-provisioning user without workspace)
    // We can create user directly with service role so they have zero workspace memberships
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email: userC.email,
      password: userC.password,
      email_confirm: true,
      user_metadata: {
        full_name: "Gamma Founder",
      },
    });

    expect(createError).toBeNull();
    expect(createdUser.user).toBeDefined();

    // Log in with this fresh user who has NO workspace
    await page.goto("/login");
    await page.fill('input[name="email"]', userC.email);
    await page.fill('input[name="password"]', userC.password);
    await page.click('button[type="submit"]');

    // Should immediately be routed to /onboarding
    await page.waitForURL(/\/onboarding/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByRole("heading", { name: "Welcome to ScopeGuard" })).toBeVisible();

    // Fill in onboarding form to create their workspace
    await page.fill('input[name="name"]', userC.workspaceName);
    await page.click('button[type="submit"]');

    // Should be redirected to /dashboard after workspace creation
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify settings now shows the newly created workspace
    await page.goto("/settings");
    await expect(page.locator("#workspaceNameInput")).toHaveValue(userC.workspaceName);
  });
});
