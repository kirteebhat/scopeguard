import { test, expect } from "@playwright/test";

test.describe("Design System Component Gallery (/dev/components)", () => {
  test("is excluded and returns 404 in production builds", async ({ page }) => {
    const response = await page.goto("/dev/components");
    // In production builds, the route must return 404
    expect(response?.status()).toBe(404);
  });
});

