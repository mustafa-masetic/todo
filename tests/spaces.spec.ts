import { randomUUID } from "node:crypto";
import { test } from "./fixtures/auth-session";
import { NavigationComponent } from "./pom/navigation.component";
import { SpacesPage } from "./pom/spaces.page";
import { ensurePageLoaded } from "./utils/page";

test.describe("Spaces", () => {
  test.use({
    authSession: {
      mode: "register",
      email: "playwright.spaces@example.com",
      firstName: "Space",
      lastName: "Tester",
      gender: "Other",
      password: "TestPass123!"
    }
  });

  test("creates and searches a space", async ({ page }) => {
    const nav = new NavigationComponent(page);
    const spacesPage = new SpacesPage(page);
    const unique = randomUUID();
    const spaceName = `PW Space ${unique}`;

    await ensurePageLoaded(page);
    await nav.themeToggle().waitFor({ state: "visible" });
    await nav.goToSpaces();
    await spacesPage.createSpace(spaceName, "Created by Playwright");
    await spacesPage.expectSpaceVisible(spaceName);

    await spacesPage.searchSpaces("no-match-playwright-value");
    await spacesPage.expectNoMatchingSpaces();

    await spacesPage.searchSpaces(spaceName);
    await spacesPage.expectSpaceVisible(spaceName);

    await page.screenshot({ path: "space-created.png" });
  });

  test("creates and deletes a space", async ({ page }) => {
    const nav = new NavigationComponent(page);
    const spacesPage = new SpacesPage(page);
    const unique = randomUUID();
    const spaceName = `PW Space Delete ${unique}`;

    await ensurePageLoaded(page);
    await nav.themeToggle().waitFor({ state: "visible" });
    await nav.goToSpaces();
    await spacesPage.createSpace(spaceName, "Will be deleted by Playwright");
    await spacesPage.expectSpaceVisible(spaceName);

    await spacesPage.openSpaceByName(spaceName);
    await spacesPage.deleteCurrentSpace();
    await spacesPage.expectSpaceDeletedToast();

    await nav.goToSpaces();
    await spacesPage.searchSpaces(spaceName);
    await spacesPage.expectNoMatchingSpaces();
  });
});
