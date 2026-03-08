import { expect, test } from "@playwright/test";
import { AuthPage } from "./pom/auth.page";
import { NavigationComponent } from "./pom/navigation.component";
import { HomePage } from "./pom/home.page";

test.describe("Navigation", () => {
  test("shows logged-out header controls", async ({ page }) => {
    const homePage = new HomePage(page);
    const nav = new NavigationComponent(page);

    await homePage.goto();
    await nav.expectLoggedOutHeaderVisible();
  });

  test("opens global search for logged-in user", async ({ page }) => {
    const authPage = new AuthPage(page);
    const nav = new NavigationComponent(page);
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;

    test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run auth tests.");

    await authPage.gotoLogin();
    await authPage.login(email as string, password as string);

    await nav.openGlobalSearch();
    await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible();
    await expect(page.getByTestId("global-search-input")).toBeVisible();
  });
});
