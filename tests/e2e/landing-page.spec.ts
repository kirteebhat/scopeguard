import { test, expect } from "@playwright/test";

test.describe("Public Landing Page E2E Suite", () => {
  test("Desktop (1280px): renders full landing page with interactive workflow and valid CTAs", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    // 1. Verify Page Title & Metadata
    await expect(page).toHaveTitle(/ScopeGuard/);

    // 2. Verify Hero Headline & CTAs
    const headline = page.locator("h1");
    await expect(headline).toContainText("Stop Eating the Cost of");
    await expect(headline).toContainText("Unapproved");

    const startFreeCta = page.getByRole("link", { name: "Create Workspace — Free" });
    await expect(startFreeCta).toBeVisible();
    await expect(startFreeCta).toHaveAttribute("href", "/signup");

    // 3. Verify How It Works Section
    const howItWorks = page.locator("#how-it-works");
    await expect(howItWorks).toBeVisible();
    await expect(howItWorks).toContainText("Set Contract Baseline");
    await expect(howItWorks).toContainText("Draft Scope Changes in 60s");
    await expect(howItWorks).toContainText("Generate Tokenized Link");
    await expect(howItWorks).toContainText("Client Approves on Mobile");

    // 4. Verify Interactive Approval Workflow Demo
    const exampleSection = page.locator("#workflow-example");
    await expect(exampleSection).toBeVisible();
    await expect(exampleSection).toContainText("Clearly labeled illustrative example");

    // Agency Proposal View is default active
    await expect(exampleSection).toContainText("Live Impact Breakdown");
    await expect(exampleSection).toContainText("20.0 hrs × ₹2,500.00/hr");
    await expect(exampleSection).toContainText("Private Agency Internal Notes (Strictly Protected)");

    // Switch to Client Approval Tab
    const clientTabBtn = page.locator("#client-tab-btn");
    await clientTabBtn.click();
    await expect(exampleSection).toContainText("Estimated Additional Cost");
    await expect(exampleSection).toContainText("₹50,000.00");

    // Test client interactive sign-off
    const nameInput = page.locator("#client-name-input");
    await expect(nameInput).toBeVisible();
    await nameInput.fill("Alexander Hamilton (COO)");

    const approveBtn = page.getByRole("button", { name: /Approve Proposal/i });
    await approveBtn.click();

    // Verify receipt state
    await expect(exampleSection).toContainText("Decision Recorded: Approved");
    await expect(exampleSection).toContainText("Alexander Hamilton (COO)");

    // Reset interactive demo
    const resetBtn = page.getByRole("button", { name: /Reset Demo/i });
    await resetBtn.click();
    await expect(page.locator("#client-name-input")).toBeVisible();

    // Switch back to Agency view
    const agencyTabBtn = page.locator("#agency-tab-btn");
    await agencyTabBtn.click();
    await expect(exampleSection).toContainText("Live Impact Breakdown");

    // 5. Verify Core Benefits Section
    const benefitsSection = page.locator("#benefits");
    await expect(benefitsSection).toBeVisible();
    await expect(benefitsSection).toContainText("Zero Client Friction");
    await expect(benefitsSection).toContainText("Immutable Audit Snapshots");
    await expect(benefitsSection).toContainText("Multi-Currency Segregation");

    // 6. Verify Pricing Hypotheses
    const pricingSection = page.locator("#pricing");
    await expect(pricingSection).toBeVisible();
    await expect(pricingSection).toContainText("Launch Hypotheses · Payments Not Yet Connected");
    await expect(pricingSection).toContainText("Free");
    await expect(pricingSection).toContainText("Pro");
    await expect(pricingSection).toContainText("₹799");
    await expect(pricingSection).toContainText("Agency");
    await expect(pricingSection).toContainText("₹1,999");
    await expect(pricingSection).toContainText("Custom");

    // Verify Pro plan button links to signup
    const proBtn = page.getByRole("link", { name: "Start Pro Trial" });
    await expect(proBtn).toHaveAttribute("href", "/signup");

    // 7. Verify FAQ Accordion (Question 0 is open by default)
    const faqSection = page.locator("#faq");
    await expect(faqSection).toBeVisible();
    await expect(faqSection).toContainText("Zero client onboarding friction.");

    // Clicking Question 1 opens Question 1
    const faq2Btn = page.getByRole("button", {
      name: "How does ScopeGuard calculate financial impact and deadlines?",
    });
    await expect(faq2Btn).toBeVisible();
    await faq2Btn.click();
    await expect(faqSection).toContainText("integer minor units");

    // 8. Verify Footer
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("ScopeGuard");
    await expect(footer).toContainText("Launch Preview Notice: Payments are not connected.");
  });

  test("Tablet (768px): responsive layout with zero horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    // Verify no horizontal scrolling overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("#pricing")).toBeVisible();
  });

  test("Mobile (360px): renders mobile navigation menu and zero horizontal overflow", async ({
    page,
  }) => {
    // 360px viewport test per Rule 4.2
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");

    // Verify zero horizontal scroll overflow at 360px
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Verify mobile hamburger menu
    const menuToggle = page.getByRole("button", { name: "Toggle navigation menu" });
    await expect(menuToggle).toBeVisible();

    // Open mobile menu
    await menuToggle.click();

    // Verify mobile links exist within the drawer
    const drawer = page.locator("#mobile-drawer");
    await expect(drawer).toBeVisible();

    const mobileHowItWorks = drawer.getByRole("link", { name: "How It Works" });
    await expect(mobileHowItWorks).toBeVisible();

    const mobileStartFree = drawer.getByRole("link", { name: "Start Free" });
    await expect(mobileStartFree).toBeVisible();
    await expect(mobileStartFree).toHaveAttribute("href", "/signup");

    // Close menu by clicking toggle again
    await menuToggle.click();
    await expect(drawer).not.toBeVisible();
  });
});
