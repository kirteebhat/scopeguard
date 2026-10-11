import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test.describe.serial("Change Requests Drafting, Live Impact & Client Preview E2E", () => {
  test.setTimeout(90000);

  const rand = Math.random().toString(36).slice(2, 7);
  const timestamp = `${Date.now()}_${rand}`;

  const ownerUser = {
    fullName: "Alex Rivera",
    workspaceName: `Apex Software Studio ${timestamp}`,
    email: `e2e_cr_owner_${timestamp}@gmail.com`,
    password: "Password123!",
  };

  const projectData = {
    name: `SaaS Billing Engine ${timestamp}`,
    clientName: "Stripe Vendor Corp",
    currency: "USD",
    budget: "45000.00",
    hourlyRate: "175.00",
    startDate: new Date().toISOString().split("T")[0],
    originalDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    description: "Multi-tenant billing engine with automated usage reports.",
    deliverableTitle: "Payment Architecture",
  };

  test("change request creation, live formula calculation, preview privacy, and list filtering", async ({
    page,
  }) => {
    // --- Step A: Provision workspace owner in Supabase ---
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

    // --- Step B: Authenticate in Browser ---
    await page.goto("/login");
    await page.fill('input[name="email"]', ownerUser.email);
    await page.fill('input[name="password"]', ownerUser.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // --- Step C: Create the Test Project with Deliverable ---
    await page.goto("/projects/new");
    await page.waitForLoadState("networkidle");

    await page.fill("#nameInput", projectData.name);
    await page.fill("#clientNameInput", projectData.clientName);
    await page.selectOption("#currencyInput", projectData.currency);
    await page.fill("#budgetInput", projectData.budget);
    await page.fill("#hourlyRateInput", projectData.hourlyRate);
    await page.fill("#startDateInput", projectData.startDate);
    await page.fill("#originalDeadlineInput", projectData.originalDeadline);
    await page.fill("#descriptionInput", projectData.description);

    // Add deliverable
    await page.fill("#newDeliverableTitle", projectData.deliverableTitle);
    await page.click("#addDeliverableButton");
    await expect(page.getByText(projectData.deliverableTitle)).toBeVisible();

    await page.click("#createProjectSubmitButton");

    // Redirected to /projects/[projectId]
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/, { timeout: 15000 });
    const projectUrl = page.url();
    const projectId = projectUrl.split("/").pop()!;

    // --- Step D: Navigate to Change Requests List ---
    await page.goto(`/projects/${projectId}/changes`);
    await page.waitForLoadState("networkidle");

    // Empty state should be visible
    await expect(page.getByText(/no change requests yet/i)).toBeVisible();
    await expect(page.getByText(/create your first client change proposal/i)).toBeVisible();

    // Click "New Change Request"
    await page.click("#createFirstChangeRequestButton");
    await expect(page).toHaveURL(new RegExp(`/changes/new\\?projectId=${projectId}`), {
      timeout: 15000,
    });

    // --- Step E: Verify Default Form Values & Inputs ---
    await expect(page.getByRole("heading", { name: /draft change request/i })).toBeVisible();

    // Verify hourly rate defaulted from project ($175.00)
    const hourlyRateInput = page.locator("#hourlyRateInput");
    await expect(hourlyRateInput).toHaveValue("175.00");

    // --- Step F: Fill in Change Request Form with Hourly Pricing ---
    await page.fill("#titleInput", "Stripe Subscription Billing & Webhooks");
    await page.fill(
      "#descriptionInput",
      "Implement recurring billing cycles, customer self-service portal, and Stripe webhook handling."
    );
    await page.fill("#reasonInput", "Client requested automated subscription monetization.");

    // Select Deliverable
    await page.selectOption("#deliverableSelect", { label: `${projectData.deliverableTitle} (pending)` });

    // Enter Hours
    await page.fill("#estimatedHoursInput", "12.5");

    // Enter Additional Days
    await page.fill("#additionalDaysInput", "14");

    // Enter Internal Confidential Notes
    const secretNotes = "Confidential margin notes: Subcontractor cost is $80/hr, margin retained is $95/hr.";
    await page.fill("#internalNotesInput", secretNotes);

    // --- Step G: Verify Live Impact Panel ---
    // Formula: 12.5 h × $175.00 = $2,187.50
    await expect(page.getByText("12.5 h × $175.00 = $2,187.50")).toBeVisible();
    await expect(page.getByText("Estimate (Unapproved)")).toBeVisible();
    await expect(page.getByText("$45,000.00").first()).toBeVisible(); // original budget
    await expect(page.getByText("+$2,187.50").first()).toBeVisible(); // proposal cost
    await expect(page.getByText("$47,187.50").first()).toBeVisible(); // revised total
    await expect(page.locator("#impactDeltaDaysDisplay")).toContainText("+14 calendar days"); // schedule shift

    // --- Step H: Preview Client Proposal & Check Confidentiality ---
    await page.click("#previewProposalButton");

    // Preview modal should appear
    const previewModal = page.getByRole("dialog");
    await expect(previewModal).toBeVisible();
    await expect(previewModal.getByText(/client proposal preview/i)).toBeVisible();
    await expect(previewModal.getByText("Stripe Subscription Billing & Webhooks")).toBeVisible();
    await expect(previewModal.getByText("Client requested automated subscription monetization.")).toBeVisible();
    await expect(previewModal.getByText(projectData.deliverableTitle, { exact: true })).toBeVisible();
    await expect(previewModal.getByText("$2,187.50").first()).toBeVisible();

    // Critical Rule: Internal notes must NEVER be visible in the proposal preview
    await expect(previewModal.getByText(secretNotes)).not.toBeVisible();
    await expect(previewModal.getByText("Confidential margin notes")).not.toBeVisible();

    // Close preview modal
    const closeBtn = previewModal.getByRole("button", { name: "Close Preview" });
    await closeBtn.scrollIntoViewIfNeeded();
    await closeBtn.click();
    await expect(previewModal).not.toBeVisible();

    // --- Step I: Verify Submit for Approval Button State ---
    const submitBtn = page.locator("#submitForApprovalButton");
    await expect(submitBtn).toBeDisabled();
    await expect(
      page.getByText(/client approval dispatch and signing links will be enabled/i)
    ).toBeVisible();

    // --- Step J: Save Draft ---
    await page.click("#saveDraftButton");

    // Should redirect to /changes/[changeId]
    await expect(page).toHaveURL(/\/changes\/[0-9a-f-]+$/, { timeout: 15000 });
    await expect(page.locator("#titleInput")).toHaveValue("Stripe Subscription Billing & Webhooks");

    // --- Step K: Return to Project Change Requests List & Filter ---
    await page.goto(`/projects/${projectId}/changes`);
    await page.waitForLoadState("networkidle");

    // Check that change request is listed with "Draft" badge
    const tableBody = page.locator("tbody");
    await expect(tableBody.getByText("Stripe Subscription Billing & Webhooks")).toBeVisible();
    await expect(tableBody.getByText("$2,187.50")).toBeVisible();
    await expect(tableBody.getByText("Draft", { exact: true })).toBeVisible();
    await expect(tableBody.getByRole("button", { name: "Edit Draft" })).toBeVisible();

    // Metric bar should reflect Total Change Proposals
    await expect(page.getByText("Total Change Proposals")).toBeVisible();

    // Test Search Filter
    const searchInput = page.locator("#changeSearchInput");
    await searchInput.fill("NonExistentTerm");
    await expect(tableBody.getByText("Stripe Subscription Billing & Webhooks")).not.toBeVisible();
    await expect(page.getByText(/no matching change requests/i)).toBeVisible();

    await searchInput.fill("Stripe");
    await expect(tableBody.getByText("Stripe Subscription Billing & Webhooks")).toBeVisible();

    // Test Status Filter
    const statusSelect = page.locator("#changeStatusFilter");
    await statusSelect.selectOption("approved");
    await expect(tableBody.getByText("Stripe Subscription Billing & Webhooks")).not.toBeVisible();

    await statusSelect.selectOption("draft");
    await expect(tableBody.getByText("Stripe Subscription Billing & Webhooks")).toBeVisible();
  });
});
