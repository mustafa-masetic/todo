import { expect, test } from "@playwright/test";

test.describe("Auth", () => {
  test("registers a new user and lands on overview", async ({ page }) => {
    const unique = Date.now();
    const email = `playwright.user.${unique}@example.com`;

    await page.goto("/register");

    await page.getByTestId("auth-first-name-input").fill("Play");
    await page.getByTestId("auth-last-name-input").fill("Wright");
    await page.getByTestId("auth-email-input").fill(email);
    await page.getByTestId("auth-gender-select").click();
    await page.getByRole("option", { name: "Other" }).click();
    await page.getByTestId("auth-password-input").fill("TestPass123!");
    await page.getByTestId("auth-submit-button").click();

    await expect(page.getByText("Your overview")).toBeVisible();
  });
});
