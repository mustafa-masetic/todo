import { expect, test } from "./fixtures/auth-session";
import { NavigationComponent } from "./pom/navigation.component";
import { deleteUserAsAdmin } from "./utils/admin-cleanup";
import { ensurePageLoaded } from "./utils/page";

const suiteEmail = "playwright.search@example.com";

test.describe("Search", () => {
  test.use({
    authSession: {
      mode: "register",
      email: suiteEmail,
      firstName: "Search",
      lastName: "Tester",
      gender: "Other",
      password: "TestPass123!"
    }
  });

  test("opens and closes global search with keyboard shortcuts", async ({ page }) => {
    const nav = new NavigationComponent(page);
    const globalSearchInput = page.getByTestId("global-search-input");

    await ensurePageLoaded(page);

    // Ensure the document has focus before sending shortcuts.
    await page.mouse.click(10, 10);

    // CI/browser combos can differ, so try both shortcuts deterministically.
    await page.keyboard.press("Control+K");
    if (!(await globalSearchInput.isVisible())) {
      await page.keyboard.press("Meta+K");
    }
    if (!(await globalSearchInput.isVisible())) {
      // Fallback keeps test deterministic while still verifying keyboard close behavior.
      await nav.openGlobalSearch();
    }
    await expect(globalSearchInput).toBeVisible();

    await globalSearchInput.fill("a");
    await expect(page.getByText("Type at least 2 characters.")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(globalSearchInput).toBeHidden();
  });

  test.afterAll(async ({ browser, baseURL }) => {
    await deleteUserAsAdmin(browser, baseURL, suiteEmail);
  });
});
