import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test.describe.serial("Projects Lifecycle, Deliverables & Role Boundary", () => {
  test.setTimeout(90000);

  const rand = Math.random().toString(36).slice(2, 7);
  const timestamp = `${Date.now()}_${rand}`;

  const ownerUser = {
    fullName: "Alex Rivera",
    workspaceName: `Digital Dynamics ${timestamp}`,
    email: `e2e_owner_${timestamp}@gmail.com`,
    password: "Password123!",
  };

  const memberUser = {
    fullName: "Sam Jordan",
    email: `e2e_member_${timestamp}@gmail.com`,
    password: "Password123!",
  };

  const projectData = {
    name: `Enterprise CRM Portal ${timestamp}`,
    clientName: "Acme Logistics",
    currency: "USD",
    budget: "45000.00",
    hourlyRate: "175.00",
    startDate: new Date().toISOString().split("T")[0],
    originalDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    description: "Initial contract baseline covering CRM architecture and customer dashboard.",
    deliverableTitle: "Wireframe & Architecture Spec",
    deliverableDesc: "Figma wireframes and high-level system layout.",
  };

  test("1. Project creation with deliverables, overview rollups, and list filtering", async ({
    page,
  }) => {
    // --- Step A: Provision workspace owner and sign in ---
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: createdOwner, error: ownerErr } = await admin.auth.admin.createUser({
      email: ownerUser.email,
      password: ownerUser.password,
      email_confirm: true,
      user_metadata: {
        full_name: ownerUser.fullName,
      },
    });

    expect(ownerErr).toBeNull();
    const ownerId = createdOwner.user!.id;

    const baseSlug = ownerUser.workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { data: createdWs } = await admin
      .from("workspaces")
      .insert({
        name: ownerUser.workspaceName,
        slug: `${baseSlug}-${Date.now()}`,
        plan: "free",
      })
      .select()
      .single();

    await admin.from("workspace_members").insert({
      workspace_id: createdWs!.id,
      user_id: ownerId,
      role: "owner",
    });

    await page.goto("/login");
    await page.fill('input[name="email"]', ownerUser.email);
    await page.fill('input[name="password"]', ownerUser.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // --- Step B: Navigate to Projects ---
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    // Empty state should be visible initially
    await expect(page.getByText(/no projects yet/i)).toBeVisible();

    // Click "Create Project"
    await page.click('a[href="/projects/new"]');
    await expect(page).toHaveURL(/\/projects\/new/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: /create new project/i })).toBeVisible();

    // --- Step C: Fill in project creation form ---
    await page.fill("#nameInput", projectData.name);
    await page.fill("#clientNameInput", projectData.clientName);
    await page.selectOption("#currencyInput", projectData.currency);
    await page.fill("#budgetInput", projectData.budget);
    await page.fill("#hourlyRateInput", projectData.hourlyRate);
    await page.fill("#startDateInput", projectData.startDate);
    await page.fill("#originalDeadlineInput", projectData.originalDeadline);
    await page.fill("#descriptionInput", projectData.description);

    // Add an initial deliverable
    await page.fill("#newDeliverableTitle", projectData.deliverableTitle);
    await page.fill("#newDeliverableDesc", projectData.deliverableDesc);
    await page.click("#addDeliverableButton");

    // Deliverable should be added to the preview list
    await expect(page.getByText(projectData.deliverableTitle)).toBeVisible();

    // Submit project
    await page.click("#createProjectSubmitButton");

    // --- Step D: Redirection to /projects/[projectId] ---
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: projectData.name })).toBeVisible();

    // Verify financial summary cards
    await expect(page.getByText("$45,000.00").first()).toBeVisible();
    await expect(page.getByText("$0.00").first()).toBeVisible();

    // Verify deliverables section has the initial deliverable
    await expect(page.getByText(projectData.deliverableTitle)).toBeVisible();

    // Verify Change Requests section empty state
    await expect(page.getByText(/no change requests yet/i)).toBeVisible();

    // --- Step E: Test Project List Search & Filtering ---
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    // The project should be listed
    await expect(page.getByText(projectData.name)).toBeVisible();

    // Filter with search query
    const searchInput = page.locator("#projectSearchInput");
    await searchInput.fill("NonExistentXYZ");
    await expect(page.getByText(projectData.name)).not.toBeVisible();
    await expect(page.getByText(/no matching projects/i)).toBeVisible();

    // Clear search query
    await searchInput.fill(projectData.name);
    await expect(page.getByText(projectData.name)).toBeVisible();

    // Test status filter
    const statusFilter = page.locator("#projectStatusFilter");
    await statusFilter.selectOption("completed");
    await expect(page.getByText(projectData.name)).not.toBeVisible();

    await statusFilter.selectOption("all");
    await expect(page.getByText(projectData.name)).toBeVisible();
  });

  test("2. Project settings modification and deliverables CRUD", async ({ page }) => {
    // --- Step A: Ensure logged in as owner ---
    await page.goto("/dashboard");
    if (page.url().includes("/login")) {
      await page.fill('input[name="email"]', ownerUser.email);
      await page.fill('input[name="password"]', ownerUser.password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    }

    // --- Step B: Open project settings ---
    await page.goto("/projects");
    await page.getByRole("link", { name: projectData.name }).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/, { timeout: 15000 });

    await page.click("#projectSettingsButton");
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+\/settings$/, { timeout: 15000 });

    // --- Step C: Update project name ---
    const updatedName = `${projectData.name} (Updated)`;
    await page.fill("#projectNameInput", updatedName);
    await page.click("#saveProjectSettingsButton");

    await expect(page.getByText(/project updated successfully/i)).toBeVisible({
      timeout: 10000,
    });

    // --- Step D: Add a new deliverable ---
    const newDelTitle = "Backend API Endpoints";
    const newDelDesc = "RESTful routes and auth middleware";

    await page.fill("#deliverableTitleInput", newDelTitle);
    await page.fill("#deliverableDescInput", newDelDesc);
    await page.click("#saveDeliverableButton");

    await expect(page.getByText(/deliverable added successfully/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(newDelTitle)).toBeVisible();

    // --- Step E: Edit deliverable status to In Progress ---
    const editBtn = page.locator(`button[aria-label="Edit ${newDelTitle}"]`);
    await editBtn.click();

    await page.selectOption("#editDeliverableStatusSelect", "in_progress");
    await page.click('button:has-text("Save Changes")');

    await expect(page.getByText(/deliverable updated successfully/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("In Progress")).toBeVisible();

    // --- Step F: Delete deliverable with confirmation dialog ---
    const deleteBtn = page.locator(`button[aria-label="Delete ${newDelTitle}"]`);
    await deleteBtn.click();

    // Confirmation dialog appears
    await expect(page.getByRole("heading", { name: "Remove Deliverable" })).toBeVisible();
    await page.click("#confirmDeleteDeliverableButton");

    await expect(page.getByText(/deliverable removed successfully/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(newDelTitle)).not.toBeVisible();
  });

  test("3. Team member role boundary: Financial fields are disabled and read-only", async ({
    page,
  }) => {
    // --- Step A: Provision member in database and associate with workspace ---
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get workspace ID created by owner
    const { data: workspaces } = await admin
      .from("workspaces")
      .select("id")
      .eq("name", ownerUser.workspaceName)
      .single();

    expect(workspaces).toBeDefined();
    const workspaceId = workspaces!.id;

    // Create member user
    const { data: createdMember, error: memberErr } = await admin.auth.admin.createUser({
      email: memberUser.email,
      password: memberUser.password,
      email_confirm: true,
      user_metadata: {
        full_name: memberUser.fullName,
      },
    });

    expect(memberErr).toBeNull();
    expect(createdMember.user).toBeDefined();
    const memberId = createdMember.user!.id;

    // Add as 'member' to workspace_members
    await admin.from("workspace_members").insert({
      workspace_id: workspaceId,
      user_id: memberId,
      role: "member",
    });

    // --- Step B: Log in as the member user ---
    await page.context().clearCookies();
    await page.goto("/login");
    await page.fill('input[name="email"]', memberUser.email);
    await page.fill('input[name="password"]', memberUser.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // --- Step C: Member visits project settings ---
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    // Click project
    const projectLink = page.getByRole("link", { name: new RegExp(projectData.name) });
    await projectLink.first().click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/, { timeout: 15000 });

    await page.click("#projectSettingsButton");
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+\/settings$/, { timeout: 15000 });

    // --- Step D: Verify financial fields are disabled ---
    await expect(page.locator("#budgetInput")).toBeDisabled();
    await expect(page.locator("#hourlyRateInput")).toBeDisabled();
    await expect(page.locator("#currencySelect")).toBeDisabled();

    // Verify warning notice is displayed
    await expect(page.locator('[data-testid="member-money-warning"]')).toBeVisible();
    await expect(
      page.getByText(/only project managers and owners can modify contractual budget baselines/i)
    ).toBeVisible();

    // Verify deliverable creation form is hidden for member
    await expect(page.locator("#deliverableTitleInput")).not.toBeVisible();
    await expect(page.locator("#saveDeliverableButton")).not.toBeVisible();
  });
});
