import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test.describe.serial("Full Multi-Context User Journey E2E (Section 17 Verification)", () => {
  test.setTimeout(180000);

  const rand = Math.random().toString(36).slice(2, 7);
  const timestamp = `${Date.now()}_${rand}`;

  const agencyUser = {
    fullName: "Diana Prince",
    workspaceName: `Themyscira Solutions ${timestamp}`,
    email: `e2e_journey_${timestamp}@gmail.com`,
    password: "Password123!",
  };

  const projectData = {
    name: `Cloud Migration Infrastructure ${timestamp}`,
    clientName: "Wayne Enterprises",
    currency: "USD",
    budget: "50000.00",
    hourlyRate: "150.00",
    startDate: new Date().toISOString().split("T")[0],
    originalDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    description: "Enterprise Kubernetes cloud migration and microservices orchestration.",
    deliverableTitle: "API Gateway Architecture",
  };

  let projectId: string;

  test.beforeEach(async () => {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await admin
      .from("approval_attempts")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
  });

  // -------------------------------------------------------------
  // Journey 1: Sign up, Create Workspace, Project, Draft, Publish,
  // Client Approval in Unauthenticated Context, Refresh, Verify Totals
  // -------------------------------------------------------------
  test("Journey 1: Agency setup -> draft -> client approval in isolated unauthenticated context -> rollup update", async ({
    page,
    browser,
  }) => {
    // 1. Agency Sign Up
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /create your agency workspace/i })).toBeVisible();

    await page.fill('input[name="fullName"]', agencyUser.fullName);
    await page.fill('input[name="workspaceName"]', agencyUser.workspaceName);
    await page.fill('input[name="email"]', agencyUser.email);
    await page.fill('input[name="password"]', agencyUser.password);
    await page.click('button[type="submit"]');

    // Handle email confirmation if required in this environment
    const checkEmailNotice = page.getByRole("heading", { name: /check your email/i });
    if (await checkEmailNotice.isVisible({ timeout: 5000 }).catch(() => false)) {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: userList } = await admin.auth.admin.listUsers();
      const createdUser = userList?.users.find((u) => u.email === agencyUser.email);
      if (createdUser) {
        await admin.auth.admin.updateUserById(createdUser.id, { email_confirm: true });
        const { data: existingMember } = await admin
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", createdUser.id)
          .maybeSingle();

        if (!existingMember) {
          const baseSlug = agencyUser.workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const { data: createdWs } = await admin
            .from("workspaces")
            .insert({
              name: agencyUser.workspaceName,
              slug: `${baseSlug}-${Date.now()}`,
              plan: "free",
            })
            .select()
            .single();

          if (createdWs) {
            await admin.from("workspace_members").insert({
              workspace_id: createdWs.id,
              user_id: createdUser.id,
              role: "owner",
            });
          }
        }
      }

      await page.goto("/login");
      await page.fill('input[name="email"]', agencyUser.email);
      await page.fill('input[name="password"]', agencyUser.password);
      await page.click('button[type="submit"]');
    }

    // Verify arrival on Dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // 2. Create Project
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
    projectId = page.url().split("/").pop()!;

    // Assert initial baseline values
    await expect(page.getByText("$50,000.00").first()).toBeVisible();
    await expect(page.getByText("0 Approved Changes")).toBeVisible();

    // 3. Create Draft Change Request
    await page.goto(`/changes/new?projectId=${projectId}`);
    await page.waitForLoadState("networkidle");

    await page.fill("#titleInput", "OAuth2 Two-Factor Authentication");
    await page.fill(
      "#descriptionInput",
      "Implement TOTP and SMS based 2FA for all enterprise API accounts."
    );
    await page.fill("#reasonInput", "Enterprise client security policy compliance.");
    await page.selectOption("#deliverableSelect", {
      label: `${projectData.deliverableTitle} (pending)`,
    });
    await page.fill("#estimatedHoursInput", "20.0"); // 20.0 hrs * $150 = $3,000.00
    await page.fill("#additionalDaysInput", "10");

    const internalSecret = "CONFIDENTIAL INTERNAL NOTE: SMS carrier integration markup is 45%.";
    await page.fill("#internalNotesInput", internalSecret);

    // Live Impact formula check
    await expect(page.getByText("20 h × $150.00 = $3,000.00")).toBeVisible();

    // Preview proposal check: internal notes MUST NOT appear
    await page.click("#previewProposalButton");
    const previewDialog = page.getByRole("dialog");
    await expect(previewDialog).toBeVisible();
    await expect(previewDialog.getByText("OAuth2 Two-Factor Authentication")).toBeVisible();
    await expect(previewDialog.getByText("$3,000.00").first()).toBeVisible();
    await expect(previewDialog.getByText(internalSecret)).not.toBeVisible();
    await previewDialog.getByRole("button", { name: "Close Preview" }).click();
    await expect(previewDialog).not.toBeVisible();

    // Save draft
    await page.click("#saveDraftButton");
    await expect(page).toHaveURL(/\/changes\/[0-9a-f-]+$/, { timeout: 15000 });
    const cr1Id = page.url().split("/").pop()!;

    // 4. Publish Change Request
    await page.click("#submitForApprovalButton");
    const publishedModal = page.getByRole("dialog");
    await expect(publishedModal).toBeVisible({ timeout: 10000 });

    const linkInput = publishedModal.locator("#approvalLinkInput");
    await expect(linkInput).toBeVisible();
    const linkVal = await linkInput.inputValue();
    const token1 = linkVal.split("/approve/").pop()!;

    await publishedModal.locator("#closeApprovalDialogButton").click();
    await expect(publishedModal).not.toBeVisible();

    // 5. Open in Separate Isolated Unauthenticated Browser Context
    const clientContext = await browser.newContext({
      viewport: { width: 375, height: 667 }, // mobile viewport
    });
    const clientPage = await clientContext.newPage();

    await clientPage.goto(`/approve/${token1}`);
    await clientPage.waitForLoadState("networkidle");

    // Invariant: Zero agency navigation or sidebar
    await expect(clientPage.getByRole("navigation")).not.toBeVisible();
    await expect(clientPage.locator("#desktopSidebar")).not.toBeVisible();

    // Verify Portal branding and scope
    await expect(clientPage.getByText("Client Approval Portal")).toBeVisible();
    await expect(clientPage.getByText("Version 1")).toBeVisible();
    await expect(clientPage.getByText("OAuth2 Two-Factor Authentication")).toBeVisible();
    await expect(clientPage.getByText("$3,000.00")).toBeVisible();
    await expect(clientPage.getByText(internalSecret)).not.toBeVisible();
    await expect(
      clientPage.getByText("Estimate, not a contract or legally binding quote")
    ).toBeVisible();

    // 6. Client Approves Proposal
    await clientPage.locator("#openApproveModalButton").click();
    const approveModal = clientPage.getByRole("dialog");
    await expect(approveModal).toBeVisible();

    await approveModal.locator("#clientNameInput").fill("Rachel Green (Client VP)");
    await approveModal.locator("#confirmApproveButton").click();

    // Verify calm recorded decision state
    await expect(clientPage.getByText("Decision Already Recorded")).toBeVisible({
      timeout: 10000,
    });
    await expect(clientPage.getByText("Proposal Approved")).toBeVisible();
    await expect(clientPage.getByText("Rachel Green (Client VP)")).toBeVisible();

    // Refresh client page to confirm idempotency
    await clientPage.reload();
    await clientPage.waitForLoadState("networkidle");
    await expect(clientPage.getByText("Decision Already Recorded")).toBeVisible();
    await expect(clientPage.getByText("Proposal Approved")).toBeVisible();

    await clientContext.close();

    // 7. Verify Agency Project Detail & Dashboard Updates
    await page.goto(`/projects/${projectId}`);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Project Impact Card assertions:
    // Original contract value: $50,000.00
    // Approved changes: +$3,000.00
    // Revised Estimated Total: $53,000.00
    await expect(page.getByText("1 Approved Change")).toBeVisible();
    await expect(page.getByText("+$3,000.00")).toBeVisible();
    await expect(page.getByText("$53,000.00")).toBeVisible();

    // Activity Feed records approval event with client name
    await expect(
      page.getByText("Client (name provided: Rachel Green (Client VP))").first()
    ).toBeVisible();

    // Dashboard verification
    await page.goto("/dashboard");
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Approved Changes")).toBeVisible();
    await expect(page.getByText("Approved Additional Scope Charges")).toBeVisible();
    await expect(page.getByText("$3,000.00").first()).toBeVisible();
    await expect(page.getByText("USD").first()).toBeVisible();
  });

  // -------------------------------------------------------------
  // Journey 2: Reject Path
  // -------------------------------------------------------------
  test("Journey 2: Reject path -> client rejects proposal -> recorded cleanly, baseline unaffected", async ({
    page,
    browser,
  }) => {
    // Agency logs in (or continues session)
    await page.goto("/dashboard");
    if (page.url().includes("/login")) {
      await page.fill('input[name="email"]', agencyUser.email);
      await page.fill('input[name="password"]', agencyUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    }

    // Create Second Change Request
    await page.goto(`/changes/new?projectId=${projectId}`);
    await page.waitForLoadState("networkidle");

    await page.fill("#titleInput", "Custom Report Generator");
    await page.fill("#descriptionInput", "Generate automated PDF summary reports.");
    await page.fill("#reasonInput", "Client requested ad-hoc reporting capability.");
    await page.fill("#estimatedHoursInput", "10.0"); // 10.0 hrs * $150 = $1,500.00

    await page.click("#saveDraftButton");
    await expect(page).toHaveURL(/\/changes\/[0-9a-f-]+$/, { timeout: 15000 });

    // Submit for approval -> Token 2
    await page.click("#submitForApprovalButton");
    const p2Modal = page.getByRole("dialog");
    await expect(p2Modal).toBeVisible({ timeout: 10000 });

    const p2LinkInput = p2Modal.locator("#approvalLinkInput");
    const p2LinkVal = await p2LinkInput.inputValue();
    const token2 = p2LinkVal.split("/approve/").pop()!;
    await p2Modal.locator("#closeApprovalDialogButton").click();

    // Isolated unauthenticated client context
    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();

    await clientPage.goto(`/approve/${token2}`);
    await clientPage.waitForLoadState("networkidle");

    await expect(clientPage.getByText("Custom Report Generator")).toBeVisible();

    // Client declines
    await clientPage.locator("#openRejectModalButton").click();
    const rejectModal = clientPage.getByRole("dialog");
    await expect(rejectModal).toBeVisible();

    await rejectModal.locator("#clientRejectNameInput").fill("Rachel Green (Client VP)");
    await rejectModal.locator("#clientRejectNotesInput").fill("Deferred to next fiscal year.");
    await rejectModal.locator("#confirmRejectButton").click();

    // Verify rejection display
    await expect(clientPage.getByText("Decision Already Recorded")).toBeVisible({
      timeout: 10000,
    });
    await expect(clientPage.getByText("Proposal Declined")).toBeVisible();
    await expect(clientPage.getByText("Rachel Green (Client VP)")).toBeVisible();

    await clientContext.close();

    // Verify Agency Project Rollup is NOT inflated by rejected amount
    await page.goto(`/projects/${projectId}`);
    await page.waitForLoadState("networkidle");

    // Totals remain at $53,000.00 (not $54,500.00)
    await expect(page.getByText("+$3,000.00")).toBeVisible();
    await expect(page.getByText("$53,000.00")).toBeVisible();

    // Verify Dashboard counts rejected change
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Approved total still exactly $3,000.00
    await expect(page.getByText("$3,000.00").first()).toBeVisible();
    await expect(page.getByText("Rejected Changes")).toBeVisible();
  });

  // -------------------------------------------------------------
  // Journey 3: Revise-then-old-link-fails Path
  // -------------------------------------------------------------
  test("Journey 3: Revise flow -> old token revoked and returns error -> republished v2 receives active token", async ({
    page,
    browser,
  }) => {
    // Agency navigates to project (logging in if session expired)
    await page.goto(`/projects/${projectId}`);
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/login")) {
      await page.fill('input[name="email"]', agencyUser.email);
      await page.fill('input[name="password"]', agencyUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(new RegExp(`/projects/${projectId}`), { timeout: 15000 });
    }

    // Create Third Change Request
    await page.goto(`/changes/new?projectId=${projectId}`);
    await page.waitForLoadState("networkidle");

    await page.fill("#titleInput", "Real-Time WebSocket Stream");
    await page.fill("#descriptionInput", "Bi-directional websocket event telemetry.");
    await page.fill("#estimatedHoursInput", "8.0");

    await page.click("#saveDraftButton");
    await expect(page).toHaveURL(/\/changes\/[0-9a-f-]+$/, { timeout: 15000 });
    const cr3Id = page.url().split("/").pop()!;

    // Publish Version 1 -> Token 3
    await page.click("#submitForApprovalButton");
    const p3Modal = page.getByRole("dialog");
    await expect(p3Modal).toBeVisible({ timeout: 10000 });

    const p3LinkInput = p3Modal.locator("#approvalLinkInput");
    const p3LinkVal = await p3LinkInput.inputValue();
    const token3 = p3LinkVal.split("/approve/").pop()!;
    await p3Modal.locator("#closeApprovalDialogButton").click();

    // Agency decides to Revise proposal (revoking Token 3 and reverting to draft)
    await page.goto(`/changes/${cr3Id}`);
    await page.waitForLoadState("networkidle");

    await page.locator("#reviseProposalButton").click();
    const reviseConfirm = page.getByRole("dialog");
    await expect(reviseConfirm).toBeVisible();
    await reviseConfirm.locator("#confirmReviseButton").click();
    await expect(reviseConfirm).not.toBeVisible({ timeout: 15000 });

    // Client visits revoked Token 3 in isolated unauthenticated context
    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();

    await clientPage.goto(`/approve/${token3}`);
    await clientPage.waitForLoadState("networkidle");

    // Assert friendly revoked/superseded state
    await expect(clientPage.getByText("Proposal Link Updated")).toBeVisible();
    await expect(
      clientPage.getByText(/this proposal was updated; ask your agency for the new link/i)
    ).toBeVisible();

    // Buttons must NOT exist on revoked link
    await expect(clientPage.locator("#openApproveModalButton")).not.toBeVisible();
    await expect(clientPage.locator("#openRejectModalButton")).not.toBeVisible();

    // Agency republishes proposal as Version 2 -> Token 4
    await page.goto(`/changes/${cr3Id}`);
    await page.waitForLoadState("networkidle");

    await page.click("#submitForApprovalButton");
    const v2Modal = page.getByRole("dialog");
    await expect(v2Modal).toBeVisible({ timeout: 10000 });

    const v2LinkInput = v2Modal.locator("#approvalLinkInput");
    const v2LinkVal = await v2LinkInput.inputValue();
    const token4 = v2LinkVal.split("/approve/").pop()!;
    await v2Modal.locator("#closeApprovalDialogButton").click();

    // Verify old Token 3 STILL fails
    await clientPage.goto(`/approve/${token3}`);
    await clientPage.waitForLoadState("networkidle");
    await expect(clientPage.getByText("Proposal Link Updated")).toBeVisible();

    // Client visits Version 2 Token 4 -> loads active Version 2 proposal
    await clientPage.goto(`/approve/${token4}`);
    await clientPage.waitForLoadState("networkidle");

    await expect(clientPage.getByText("Version 2")).toBeVisible();
    await expect(clientPage.getByText("Awaiting Client Sign-off")).toBeVisible();
    await expect(clientPage.locator("#openApproveModalButton")).toBeVisible();
    await expect(clientPage.locator("#openRejectModalButton")).toBeVisible();

    await clientContext.close();
  });
});

