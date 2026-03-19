import { expect, test } from "./fixtures/auth-session";
import { NavigationComponent } from "./pom/navigation.component";
import { HomePage } from "./pom/home.page";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("Navigation", () => {
  test("shows logged-out header controls", async ({ page }) => {
    const homePage = new HomePage(page);
    const nav = new NavigationComponent(page);

    await homePage.goto();
    await nav.expectLoggedOutHeaderVisible();
  });
});

test.describe("Navigation", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run auth tests.");
  test.use({
    authSession: email && password ? { mode: "login", email, password } : null
  });

  test("opens global search for logged-in user", async ({ page }) => {
    const nav = new NavigationComponent(page);

    await nav.openGlobalSearch();
    await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible();
    await expect(page.getByTestId("global-search-input")).toBeVisible();

    await page.screenshot({ path: "global-search-opened.png" });
  });
});
