import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { hashApprovalToken } from "../../lib/server/tokens";

test.describe.serial("Client Approval Portal /approve/[token] E2E", () => {
  test.setTimeout(180000);

  const rand = Math.random().toString(36).slice(2, 7);
  const timestamp = `${Date.now()}_${rand}`;

  const ownerUser = {
    fullName: "Arthur Pendelton",
    workspaceName: `Kestrel Creative ${timestamp}`,
    email: `e2e_client_portal_${timestamp}@test.com`,
    password: "Password123!",
  };

  const projectData = {
    name: `NextGen Mobile Banking ${timestamp}`,
    clientName: "Horizon FinTech Ltd",
    currency: "USD",
    budget: "95000.00",
    hourlyRate: "200.00",
    startDate: new Date().toISOString().split("T")[0],
    originalDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    description: "Fintech mobile application with high-frequency ledger processing.",
    deliverableTitle: "Secure Auth & Transaction Module",
  };

  test("full client approval portal lifecycle: review, approve, refresh, second tab, reject flow, expired token, and revoked/superseded tokens", async ({
    page,
    browser,
  }) => {
    // -------------------------------------------------------------
    // Step 0: Provision Owner & Workspace in Supabase
    // -------------------------------------------------------------
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

    // Clear approval attempts for test run to prevent rate-limit throttling across browsers
    await admin
      .from("approval_attempts")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // -------------------------------------------------------------
    // Step 1: Agency Login & Project Setup
    // -------------------------------------------------------------
    await page.goto("/login");
    await page.fill('input[name="email"]', ownerUser.email);
    await page.fill('input[name="password"]', ownerUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    // Create Project
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
    await page.click("#createProjectSubmitButton");
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/, { timeout: 15000 });
    const projectId = page.url().split("/").pop()!;

    // -------------------------------------------------------------
    // Step 2: Create & Publish Proposal 1 (For Approve & Refresh Test)
    // -------------------------------------------------------------
    await page.goto(`/changes/new?projectId=${projectId}`);
    await page.waitForLoadState("networkidle");

    await page.fill("#titleInput", "Biometric Authentication & Keychain Sync");
    await page.fill(
      "#descriptionInput",
      "Implement FaceID, TouchID, and encrypted hardware keystore backups."
    );
    await page.fill("#reasonInput", "Client requested enterprise compliance upgrade.");
    await page.fill("#estimatedHoursInput", "20.0");
    await page.fill("#additionalDaysInput", "14");
    await page.fill("#internalNotesInput", "CONFIDENTIAL: Requires proprietary biometric SDK");

    await page.click("#saveDraftButton");
    await expect(page).toHaveURL(/\/changes\/[0-9a-f-]+$/, { timeout: 15000 });

    // Submit for approval
    await page.click("#submitForApprovalButton");
    const publishedDialog = page.getByRole("dialog");
    await expect(publishedDialog).toBeVisible({ timeout: 10000 });

    const linkInput = publishedDialog.locator("#approvalLinkInput");
    await expect(linkInput).toBeVisible();
    const linkVal = await linkInput.inputValue();
    const token1 = linkVal.split("/approve/").pop()!;

    await publishedDialog.locator("#closeApprovalDialogButton").click();
    await expect(publishedDialog).not.toBeVisible();

    // -------------------------------------------------------------
    // Step 3: Client View at Mobile Width: Review, Approve, Refresh, Second Tab
    // -------------------------------------------------------------
    const clientContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
    });
    const clientPage = await clientContext.newPage();

    // Visit approval link
    await clientPage.goto(`/approve/${token1}`);
    await clientPage.waitForLoadState("networkidle");

    // Invariant: Zero agency navigation or sidebar links
    await expect(clientPage.getByRole("navigation")).not.toBeVisible();
    await expect(clientPage.locator("#desktopSidebar")).not.toBeVisible();

    // Verify Portal Header & Agency Branding
    await expect(clientPage.getByText("Client Approval Portal")).toBeVisible();
    await expect(clientPage.getByText(ownerUser.workspaceName)).toBeVisible();
    await expect(clientPage.getByText(projectData.name)).toBeVisible();

    // Verify Proposal Scope
    await expect(clientPage.getByText("Version 1")).toBeVisible();
    await expect(clientPage.getByText("Awaiting Client Sign-off")).toBeVisible();
    await expect(
      clientPage.getByText("Biometric Authentication & Keychain Sync")
    ).toBeVisible();

    // Invariant: Internal notes must NEVER appear
    await expect(
      clientPage.getByText("CONFIDENTIAL: Requires proprietary biometric SDK")
    ).not.toBeVisible();
    await expect(clientPage.getByText(/confidential/i)).not.toBeVisible();

    // Verify Financial Impact & Mandatory Disclaimer
    await expect(clientPage.getByText("$4,000.00")).toBeVisible();
    await expect(clientPage.getByText(/20 hrs × \$200\.00\/hr/i)).toBeVisible();
    await expect(
      clientPage.getByText("Estimate, not a contract or legally binding quote")
    ).toBeVisible();

    // Verify Action Buttons (Touch targets)
    const approveBtn = clientPage.locator("#openApproveModalButton");
    const rejectBtn = clientPage.locator("#openRejectModalButton");
    await expect(approveBtn).toBeVisible();
    await expect(rejectBtn).toBeVisible();

    // Click Approve to open Confirmation Dialog
    await approveBtn.click();
    const approveModal = clientPage.getByRole("dialog");
    await expect(approveModal).toBeVisible();
    await expect(approveModal.getByText("Approve Scope Modification")).toBeVisible();
    await expect(approveModal.getByText("Version 1")).toBeVisible();
    await expect(approveModal.getByText("$4,000.00")).toBeVisible();

    // Validate client name requirement
    const confirmApproveBtn = approveModal.locator("#confirmApproveButton");
    await confirmApproveBtn.click();
    await expect(
      approveModal.getByText(/please enter your full name \(at least 2 characters\)/i)
    ).toBeVisible();

    // Fill valid name and submit
    await approveModal.locator("#clientNameInput").fill("Marcus Vance");
    await confirmApproveBtn.click();

    // Verify confirmation state displayed calmly
    await expect(clientPage.getByText("Decision Already Recorded")).toBeVisible({
      timeout: 10000,
    });
    await expect(clientPage.getByText("Proposal Approved")).toBeVisible();
    await expect(clientPage.getByText("Marcus Vance")).toBeVisible();

    // Refresh test
    await clientPage.reload();
    await clientPage.waitForLoadState("networkidle");
    await expect(clientPage.getByText("Decision Already Recorded")).toBeVisible();
    await expect(clientPage.getByText("Proposal Approved")).toBeVisible();
    await expect(clientPage.getByText("Marcus Vance")).toBeVisible();

    // Second tab / reopen test
    const secondTab = await clientContext.newPage();
    await secondTab.goto(`/approve/${token1}`);
    await secondTab.waitForLoadState("networkidle");
    await expect(secondTab.getByText("Decision Already Recorded")).toBeVisible();
    await expect(secondTab.getByText("Marcus Vance")).toBeVisible();
    await secondTab.close();

    // -------------------------------------------------------------
    // Step 4: Reject Flow on Another Change Request at Mobile Width
    // -------------------------------------------------------------
    await page.goto(`/changes/new?projectId=${projectId}`);
    await page.waitForLoadState("networkidle");

    await page.fill("#titleInput", "Automated Daily Ledger Reconciliation");
    await page.fill(
      "#descriptionInput",
      "Nightly batch cron reconciliation with core banking system."
    );
    await page.fill("#estimatedHoursInput", "10.0");

    await page.click("#saveDraftButton");
    await expect(page).toHaveURL(/\/changes\/[0-9a-f-]+$/, { timeout: 15000 });

    // Submit for approval
    await page.click("#submitForApprovalButton");
    const p2Dialog = page.getByRole("dialog");
    await expect(p2Dialog).toBeVisible({ timeout: 10000 });

    const p2LinkInput = p2Dialog.locator("#approvalLinkInput");
    const p2LinkVal = await p2LinkInput.inputValue();
    const token2 = p2LinkVal.split("/approve/").pop()!;
    await p2Dialog.locator("#closeApprovalDialogButton").click();

    // Client visits Proposal 2 at mobile width
    await clientPage.goto(`/approve/${token2}`);
    await clientPage.waitForLoadState("networkidle");

    await expect(
      clientPage.getByText("Automated Daily Ledger Reconciliation")
    ).toBeVisible();

    // Click Reject
    await clientPage.locator("#openRejectModalButton").click();
    const rejectModal = clientPage.getByRole("dialog");
    await expect(rejectModal).toBeVisible();
    await expect(rejectModal.getByText("Decline Scope Modification")).toBeVisible();

    await rejectModal.locator("#clientRejectNameInput").fill("Eleanor Vance");
    await rejectModal
      .locator("#clientRejectNotesInput")
      .fill("Deferred to next sprint.");
    await rejectModal.locator("#confirmRejectButton").click();

    // Verify rejection recorded state
    await expect(clientPage.getByText("Decision Already Recorded")).toBeVisible({
      timeout: 10000,
    });
    await expect(clientPage.getByText("Proposal Declined")).toBeVisible();
    await expect(clientPage.getByText("Eleanor Vance")).toBeVisible();

    // -------------------------------------------------------------
    // Step 5: Expired Token State
    // -------------------------------------------------------------
    await page.goto(`/changes/new?projectId=${projectId}`);
    await page.waitForLoadState("networkidle");

    await page.fill("#titleInput", "Audit Trail Export Engine");
    await page.fill("#descriptionInput", "Export system event logs in CSV/JSON.");
    await page.fill("#estimatedHoursInput", "5.0");

    await page.click("#saveDraftButton");
    await expect(page).toHaveURL(/\/changes\/[0-9a-f-]+$/, { timeout: 15000 });

    await page.click("#submitForApprovalButton");
    const p3Dialog = page.getByRole("dialog");
    await expect(p3Dialog).toBeVisible({ timeout: 10000 });

    const p3LinkInput = p3Dialog.locator("#approvalLinkInput");
    const p3LinkVal = await p3LinkInput.inputValue();
    const token3 = p3LinkVal.split("/approve/").pop()!;
    const token3Hash = hashApprovalToken(token3);
    await p3Dialog.locator("#closeApprovalDialogButton").click();

    // Adjust expires_at in local DB to be 2 days in the past
    const expiredDate = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    await admin
      .from("approval_tokens")
      .update({ expires_at: expiredDate })
      .eq("token_hash", token3Hash);

    // Client visits expired token at mobile width
    await clientPage.goto(`/approve/${token3}`);
    await clientPage.waitForLoadState("networkidle");

    // Verify friendly expired state
    await expect(
      clientPage.getByRole("heading", { name: "Proposal Link Expired" })
    ).toBeVisible();
    await expect(
      clientPage.getByText(
        /this proposal link expired after 14 days without a client decision/i
      )
    ).toBeVisible();

    // Buttons must NOT exist
    await expect(clientPage.locator("#openApproveModalButton")).not.toBeVisible();
    await expect(clientPage.locator("#openRejectModalButton")).not.toBeVisible();

    // -------------------------------------------------------------
    // Step 6: Revoked & Superseded Token States
    // -------------------------------------------------------------
    await page.goto(`/changes/new?projectId=${projectId}`);
    await page.waitForLoadState("networkidle");

    await page.fill("#titleInput", "Real-Time WebSocket Notifications");
    await page.fill("#descriptionInput", "Push notification webhooks.");
    await page.fill("#estimatedHoursInput", "8.0");

    await page.click("#saveDraftButton");
    await expect(page).toHaveURL(/\/changes\/[0-9a-f-]+$/, { timeout: 15000 });
    const cr4Id = page.url().split("/").pop()!;

    // Submit for approval -> Token 4
    await page.click("#submitForApprovalButton");
    const p4Dialog = page.getByRole("dialog");
    await expect(p4Dialog).toBeVisible({ timeout: 10000 });

    const p4LinkInput = p4Dialog.locator("#approvalLinkInput");
    const p4LinkVal = await p4LinkInput.inputValue();
    const token4 = p4LinkVal.split("/approve/").pop()!;
    await p4Dialog.locator("#closeApprovalDialogButton").click();

    // Agency user decides to Revise Proposal (which revokes Token 4 and reverts to draft)
    await page.goto(`/changes/${cr4Id}`);
    await page.waitForLoadState("networkidle");

    await page.locator("#reviseProposalButton").click();
    const reviseConfirm = page.getByRole("dialog");
    await expect(reviseConfirm).toBeVisible();
    await reviseConfirm.locator("#confirmReviseButton").click();
    await expect(reviseConfirm).not.toBeVisible();

    // Client visits revoked Token 4
    await clientPage.goto(`/approve/${token4}`);
    await clientPage.waitForLoadState("networkidle");

    // Friendly revoked notice
    await expect(clientPage.getByText("Proposal Link Updated")).toBeVisible();
    await expect(
      clientPage.getByText(/this proposal was updated; ask your agency for the new link/i)
    ).toBeVisible();

    // Agency republishes as Version 2 -> Token 5
    await page.goto(`/changes/${cr4Id}`);
    await page.waitForLoadState("networkidle");
    await page.click("#submitForApprovalButton");

    const v2Dialog = page.getByRole("dialog");
    await expect(v2Dialog).toBeVisible({ timeout: 10000 });
    const v2LinkInput = v2Dialog.locator("#approvalLinkInput");
    const v2LinkVal = await v2LinkInput.inputValue();
    const token5 = v2LinkVal.split("/approve/").pop()!;
    await v2Dialog.locator("#closeApprovalDialogButton").click();

    // Old token 4 still reports superseded/revoked
    await clientPage.goto(`/approve/${token4}`);
    await clientPage.waitForLoadState("networkidle");
    await expect(clientPage.getByText("Proposal Link Updated")).toBeVisible();

    // New token 5 opens active Version 2 proposal
    await clientPage.goto(`/approve/${token5}`);
    await clientPage.waitForLoadState("networkidle");
    await expect(clientPage.getByText("Version 2")).toBeVisible();
    await expect(clientPage.getByText("Awaiting Client Sign-off")).toBeVisible();
    await expect(clientPage.locator("#openApproveModalButton")).toBeVisible();

    await clientContext.close();
  });
});
