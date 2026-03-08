import { expect, test } from "@playwright/test";
import { AuthPage } from "./pom/auth.page";
import { HomePage } from "./pom/home.page";
import { NavigationComponent } from "./pom/navigation.component";

test.describe("Auth Negative", () => {
  test("rejects invalid login credentials", async ({ page }) => {
    const authPage = new AuthPage(page);

    await authPage.gotoLogin();
    await authPage.login("invalid.user@example.com", "WrongPass123!");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId("auth-submit-button")).toBeVisible();
    await expect(page.getByText("Authentication failed")).toBeVisible();
  });

  test("rejects duplicate registration email", async ({ page }) => {
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const nav = new NavigationComponent(page);
    const unique = Date.now();
    const email = `playwright.duplicate.${unique}@example.com`;

    await authPage.gotoRegister();
    await authPage.register({
      firstName: "Duplicate",
      lastName: "Tester",
      email,
      gender: "Other",
      password: "TestPass123!"
    });
    await homePage.expectOverviewVisible();

    await nav.logout();
    await expect(page).toHaveURL("/");

    await authPage.gotoRegister();
    await authPage.register({
      firstName: "Duplicate",
      lastName: "Tester",
      email,
      gender: "Other",
      password: "TestPass123!"
    });

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByText("Authentication failed")).toBeVisible();
  });
});
