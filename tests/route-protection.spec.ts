import { expect, test } from "@playwright/test";
import { HomePage } from "./pom/home.page";
import { NavigationComponent } from "./pom/navigation.component";

test.describe("Route protection", () => {
  test("redirects logged-out users from protected routes to home", async ({ page }) => {
    const homePage = new HomePage(page);
    const nav = new NavigationComponent(page);
    const protectedPaths = ["/spaces", "/tasks", "/account/settings"];

    for (const path of protectedPaths) {
      await page.goto(path);
      await expect(page).toHaveURL("/");
      await homePage.goto();
      await nav.expectLoggedOutHeaderVisible();
    }
  });
});
