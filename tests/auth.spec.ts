import { test } from "@playwright/test";
import { AuthPage } from "./pom/auth.page";
import { HomePage } from "./pom/home.page";

test.describe("Auth", () => {
  test("registers a new user and lands on overview", async ({ page }) => {
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const unique = Date.now();
    const email = `playwright.user.${unique}@example.com`;

    await authPage.gotoRegister();
    await authPage.register({
      firstName: "Play",
      lastName: "Wright",
      email,
      gender: "Other",
      password: "TestPass123!"
    });

    await homePage.expectOverviewVisible();

    await page.screenshot({ path: "user-registered.png" });
  });
});
