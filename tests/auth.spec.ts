import { randomUUID } from "node:crypto";
import { test } from "@playwright/test";
import { AuthPage } from "./pom/auth.page";
import { AdminPage } from "./pom/admin.page";
import { HomePage } from "./pom/home.page";
import { NavigationComponent } from "./pom/navigation.component";

test.describe("Auth", () => {
  test("registers a new user and lands on overview", async ({ page }) => {
    const authPage = new AuthPage(page);
    const homePage = new HomePage(page);
    const adminPage = new AdminPage(page);
    const nav = new NavigationComponent(page);
    const unique = randomUUID();
    const email = `playwright.user.${unique}@example.com`;
    const adminEmail = process.env.E2E_EMAIL;
    const adminPassword = process.env.E2E_PASSWORD;

    await authPage.register({
      firstName: "Play",
      lastName: "Wright",
      email,
      gender: "Other",
      password: "TestPass123!"
    });

    await homePage.expectOverviewVisible();

    await page.screenshot({ path: "user-registered.png" });

    if (adminEmail && adminPassword) {
      await nav.logout();
      await authPage.loginExpectSuccess(adminEmail, adminPassword);
      await nav.goToAdmin();
      await adminPage.openUsersTab();
      await adminPage.searchUsers(email);
      await adminPage.deleteUser(email);
    }
  });
});
