import { test, expect } from "@playwright/test";

test.describe("Design System Component Gallery (/dev/components)", () => {
  test("loads gallery and displays core primitives", async ({ page }) => {
    await page.goto("/dev/components");

    // Header & Badges
    await expect(page.locator("h1")).toContainText("Design System & UI Component Gallery");
    await expect(page.getByText("Draft (Editable)")).toBeVisible();
    await expect(page.getByText("Pending Approval (14d Token Active)")).toBeVisible();
    await expect(page.getByText("Approved (Locked Snapshot)")).toBeVisible();

    // Buttons
    const primaryBtn = page.getByRole("button", { name: "Primary Button" });
    await expect(primaryBtn).toBeVisible();
    await primaryBtn.click();
    await expect(page.getByText("Primary Clicked")).toBeVisible();

    // Dialog & Escape key dismissal
    const dialogBtn = page.getByRole("button", { name: /Open Test Dialog/i });
    await dialogBtn.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Publish Change Proposal")).toBeVisible();

    // Press Escape to dismiss
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("renders cleanly on 360px mobile viewport without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/dev/components");

    await expect(page.locator("h1")).toBeVisible();

    // Verify page scroll width does not exceed viewport width
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px margin for subpixel rendering
  });
});

