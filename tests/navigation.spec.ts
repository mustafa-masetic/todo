import { expect, test } from "@playwright/test";

test.describe("Navigation", () => {
  test("shows logged-out header controls", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("nav-home-button")).toBeVisible();
    await expect(page.getByTestId("nav-login-button")).toBeVisible();
    await expect(page.getByTestId("nav-theme-toggle")).toBeVisible();
  });

  test("opens global search for logged-in user", async ({ page }) => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;

    test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run auth tests.");

    await page.goto("/login");
    await page.getByTestId("auth-email-input").fill(email as string);
    await page.getByTestId("auth-password-input").fill(password as string);
    await page.getByTestId("auth-submit-button").click();

    const searchTrigger = page
      .getByTestId("nav-search-button")
      .or(page.getByTestId("nav-search-icon-button"));

    await expect(searchTrigger.first()).toBeVisible();
    await searchTrigger.first().click();
    await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible();
    await expect(page.getByTestId("global-search-input")).toBeVisible();
  });
});
