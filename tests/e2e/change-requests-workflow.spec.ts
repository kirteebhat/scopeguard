import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test.describe.serial("Change Requests Publishing, Link Generation, Revision & Withdrawal E2E", () => {
  test.setTimeout(90000);

  const rand = Math.random().toString(36).slice(2, 7);
  const timestamp = `${Date.now()}_${rand}`;

  const ownerUser = {
    fullName: "Elena Rostova",
    workspaceName: `Vanguard Design Co ${timestamp}`,
    email: `e2e_pub_owner_${timestamp}@gmail.com`,
    password: "Password123!",
  };

  const projectData = {
    name: `Enterprise Analytics Portal ${timestamp}`,
    clientName: "Northstar Holdings",
    currency: "USD",
    budget: "80000.00",
    hourlyRate: "200.00",
    startDate: new Date().toISOString().split("T")[0],
    originalDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    description: "Executive analytics dashboard with role-based metric filters.",
    deliverableTitle: "Telemetry Ingestion Pipeline",
  };

  test("full browser lifecycle: draft -> publish v1 -> dialog with no-email notice -> revoke & regen link -> revise to draft -> republish v2 -> timeline display -> withdraw", async ({
    page,
  }) => {
    // --- Step A: Provision owner user in Supabase ---
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

    // --- Step B: Log In ---
    await page.goto("/login");
    await page.fill('input[name="email"]', ownerUser.email);
    await page.fill('input[name="password"]', ownerUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // --- Step C: Create Project with Deliverable ---
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

    await page.fill("#newDeliverableTitle", projectData.deliverableTitle);
    await page.click("#addDeliverableButton");
    await expect(page.getByText(projectData.deliverableTitle)).toBeVisible();

    await page.click("#createProjectSubmitButton");
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/, { timeout: 15000 });
    const projectId = page.url().split("/").pop()!;

    // --- Step D: Create & Save Draft Change Request ---
    await page.goto(`/changes/new?projectId=${projectId}`);
    await page.waitForLoadState("networkidle");

    await page.fill("#titleInput", "Real-Time Telemetry Stream & Alerting");
    await page.fill(
      "#descriptionInput",
      "Deploy Apache Kafka connectors and real-time threshold alert triggers."
    );
    await page.fill("#reasonInput", "Client requested instantaneous incident detection.");
    await page.fill("#estimatedHoursInput", "15.0");
    await page.fill("#additionalDaysInput", "10");

    await page.click("#saveDraftButton");
    await expect(page).toHaveURL(/\/changes\/[0-9a-f-]+$/, { timeout: 15000 });
    const changeId = page.url().split("/").pop()!;

    // --- Step E: Submit for Approval from Draft Page ---
    const submitBtn = page.locator("#submitForApprovalButton");
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Published Link Dialog should appear
    const publishedDialog = page.getByRole("dialog");
    await expect(publishedDialog).toBeVisible({ timeout: 10000 });
    await expect(publishedDialog.getByText(/client approval link generated/i)).toBeVisible();
    await expect(publishedDialog.getByText(/version 1 has been published/i)).toBeVisible();

    // Critical Requirement: Plain-language note that NO email has been sent
    await expect(publishedDialog.getByText(/no email has been sent/i)).toBeVisible();
    await expect(
      publishedDialog.getByText(/scopeguard does not dispatch emails on your behalf/i)
    ).toBeVisible();

    // Verify 14-day expiry notice
    await expect(publishedDialog.getByText(/expires on/i)).toBeVisible();
    await expect(publishedDialog.getByText(/14 days from generation/i)).toBeVisible();

    // Verify link box contains /approve/
    const linkInput = publishedDialog.locator("#approvalLinkInput");
    await expect(linkInput).toBeVisible();
    const linkVal = await linkInput.inputValue();
    expect(linkVal).toMatch(/\/approve\/[A-Za-z0-9_-]{43}/);

    // Click "Done"
    await publishedDialog.locator("#closeApprovalDialogButton").click();
    await expect(publishedDialog).not.toBeVisible();

    // Reload / wait for read-only proposal page
    await page.goto(`/changes/${changeId}`);
    await page.waitForLoadState("networkidle");

    // --- Step F: Verify Read-Only Proposal & Pending State Actions ---
    await expect(page.getByText("Proposal Locked for Approval")).toBeVisible();
    await expect(page.locator("#pendingWorkflowBar")).toBeVisible();

    // Check action buttons exist
    const regenBtn = page.locator("#regenerateApprovalLinkButton");
    const reviseBtn = page.locator("#reviseProposalButton");
    const withdrawBtn = page.locator("#withdrawProposalButton");
    await expect(regenBtn).toBeVisible();
    await expect(reviseBtn).toBeVisible();
    await expect(withdrawBtn).toBeVisible();

    // Check version timeline shows Version 1 as Awaiting Client Sign-off
    const historyCard = page.locator("#versionHistoryCard");
    await expect(historyCard).toBeVisible();
    await expect(historyCard.getByText("Version 1")).toBeVisible();
    await expect(historyCard.getByText("Awaiting Client Sign-off")).toBeVisible();

    // --- Step G: Regenerate Approval Token ---
    await regenBtn.click();
    const regenDialog = page.getByRole("dialog");
    await expect(regenDialog).toBeVisible({ timeout: 10000 });
    await expect(regenDialog.getByText(/new approval link generated/i)).toBeVisible();
    await expect(regenDialog.getByText(/no email has been sent/i)).toBeVisible();

    const regenLinkInput = regenDialog.locator("#approvalLinkInput");
    const newLinkVal = await regenLinkInput.inputValue();
    expect(newLinkVal).toMatch(/\/approve\/[A-Za-z0-9_-]{43}/);
    expect(newLinkVal).not.toBe(linkVal); // Freshly generated token

    await regenDialog.locator("#closeApprovalDialogButton").click();
    await expect(regenDialog).not.toBeVisible();

    // --- Step H: Revise Proposal (Reverts to Draft) ---
    await reviseBtn.click();

    // Revise Confirmation Dialog
    const reviseConfirmDialog = page.getByRole("dialog");
    await expect(reviseConfirmDialog).toBeVisible();
    await expect(reviseConfirmDialog.getByText(/revise proposal\?/i)).toBeVisible();
    await expect(
      reviseConfirmDialog.getByText(/reverting this proposal to draft will revoke the active client approval link/i)
    ).toBeVisible();

    await reviseConfirmDialog.locator("#confirmReviseButton").click();
    await expect(reviseConfirmDialog).not.toBeVisible();

    // Reload / wait for draft edit page
    await page.goto(`/changes/${changeId}`);
    await page.waitForLoadState("networkidle");

    // Status is now draft again -> form rendered
    await expect(page.locator("#titleInput")).toBeVisible();
    await expect(page.locator("#saveDraftButton")).toBeVisible();

    // --- Step I: Modify Scope and Republish as Version 2 ---
    await page.fill("#titleInput", "Real-Time Telemetry & Slack Escalation");
    await page.click("#saveDraftButton");
    await page.waitForLoadState("networkidle");

    // Submit for approval again
    await page.click("#submitForApprovalButton");
    const v2Dialog = page.getByRole("dialog");
    await expect(v2Dialog).toBeVisible({ timeout: 10000 });
    await expect(v2Dialog.getByText(/version 2 has been published/i)).toBeVisible();
    await v2Dialog.locator("#closeApprovalDialogButton").click();
    await expect(v2Dialog).not.toBeVisible();

    // Reload / wait for read-only view
    await page.goto(`/changes/${changeId}`);
    await page.waitForLoadState("networkidle");

    // Check Version Timeline now displays Version 2 and Version 1
    const updatedHistory = page.locator("#versionHistoryCard");
    await expect(updatedHistory.getByText("Version 2")).toBeVisible();
    await expect(updatedHistory.getByText("Awaiting Client Sign-off")).toBeVisible();
    await expect(updatedHistory.getByText("Version 1")).toBeVisible();
    await expect(updatedHistory.getByText("Superseded / Revoked")).toBeVisible();

    // --- Step J: Terminal Withdrawal ---
    await page.locator("#withdrawProposalButton").click();

    const withdrawConfirmDialog = page.getByRole("dialog");
    await expect(withdrawConfirmDialog).toBeVisible();
    await expect(withdrawConfirmDialog.getByText(/withdraw proposal\?/i)).toBeVisible();
    await expect(
      withdrawConfirmDialog.getByText(/all active client links will be permanently revoked immediately/i)
    ).toBeVisible();

    await withdrawConfirmDialog.locator("#confirmWithdrawButton").click();
    await expect(withdrawConfirmDialog).not.toBeVisible();

    // Reload / wait for page in terminal withdrawn state
    await page.goto(`/changes/${changeId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Proposal Withdrawn")).toBeVisible();
    await expect(page.locator("#pendingWorkflowBar")).not.toBeVisible();
    await expect(page.locator("#withdrawProposalButton")).not.toBeVisible();
    await expect(page.locator("#reviseProposalButton")).not.toBeVisible();
    await expect(page.locator("#regenerateApprovalLinkButton")).not.toBeVisible();
  });
});

