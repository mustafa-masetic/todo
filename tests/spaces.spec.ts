import { randomUUID } from "node:crypto";
import { test } from "@playwright/test";
import { AuthPage } from "./pom/auth.page";
import { NavigationComponent } from "./pom/navigation.component";
import { SpacesPage } from "./pom/spaces.page";

test.describe("Spaces", () => {
  test("creates and searches a space", async ({ page }) => {
    const authPage = new AuthPage(page);
    const nav = new NavigationComponent(page);
    const spacesPage = new SpacesPage(page);
    const unique = randomUUID();
    const email = `playwright.spaces.${unique}@example.com`;
    const spaceName = `PW Space ${unique}`;

    await authPage.gotoRegister();
    await authPage.register({
      firstName: "Space",
      lastName: "Tester",
      email,
      gender: "Other",
      password: "TestPass123!"
    });

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
    const authPage = new AuthPage(page);
    const nav = new NavigationComponent(page);
    const spacesPage = new SpacesPage(page);
    const unique = randomUUID();
    const email = `playwright.spaces.delete.${unique}@example.com`;
    const spaceName = `PW Space Delete ${unique}`;

    await authPage.gotoRegister();
    await authPage.register({
      firstName: "Space",
      lastName: "Delete",
      email,
      gender: "Other",
      password: "TestPass123!"
    });

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
