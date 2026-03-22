import { randomUUID } from "node:crypto";
import { expect, test } from "./fixtures/auth-session";
import { AdminPage } from "./pom/admin.page";
import { AuthPage } from "./pom/auth.page";
import { NavigationComponent } from "./pom/navigation.component";
import { SpacesPage } from "./pom/spaces.page";
import { ensurePageLoaded } from "./utils/page";

const adminEmail = process.env.E2E_EMAIL;
const adminPassword = process.env.E2E_PASSWORD;

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

  test("space members tab supports search and invite flow", async ({ page, browser, baseURL }) => {
    const adminPage = new AdminPage(page);
    const nav = new NavigationComponent(page);
    const spacesPage = new SpacesPage(page);
    const unique = randomUUID();
    const spaceName = `PW Members Space ${unique}`;
    const invitedUserEmail = `playwright.member.${unique}@example.com`;
    const invitedUserPassword = "TestPass123!";
    const invitedUserContext = await browser.newContext({
      baseURL: baseURL ?? undefined,
      storageState: { cookies: [], origins: [] }
    });
    const invitedUserPage = await invitedUserContext.newPage();
    const invitedUserAuth = new AuthPage(invitedUserPage);

    await invitedUserAuth.gotoRegister();
    await invitedUserAuth.register({
      email: invitedUserEmail,
      firstName: "Invite",
      lastName: "Member",
      gender: "Other",
      password: invitedUserPassword
    });

    await ensurePageLoaded(page);
    await nav.themeToggle().waitFor({ state: "visible" });
    await nav.goToSpaces();
    await spacesPage.createSpace(spaceName, "Members flow space");
    await spacesPage.openSpaceByName(spaceName);

    await page.getByRole("tab", { name: /Members \(/ }).click();
    await page.getByPlaceholder("Search members...").fill("Space");
    await expect(page.getByText("Space Tester", { exact: true })).toBeVisible();

    await page.getByPlaceholder("Search members...").fill("");
    await page.getByTestId("space-invite-people-button").click();
    const inviteModal = page.getByTestId("invite-modal");
    await inviteModal.getByTestId("invite-search-input").fill(invitedUserEmail);
    await expect(inviteModal.getByText(invitedUserEmail, { exact: true })).toBeVisible();
    await inviteModal.getByRole("button", { name: "Invite" }).click();
    await expect(page.getByText("Invite sent")).toBeVisible();

    await expect(page.getByText(invitedUserEmail, { exact: true })).toBeVisible();
    await expect(page.getByText("Invited", { exact: true })).toBeVisible();

    await invitedUserContext.close();

    await nav.goToSpaces();
    await spacesPage.searchSpaces(spaceName);
    await spacesPage.openSpaceByName(spaceName);
    await spacesPage.deleteCurrentSpace();
    await spacesPage.expectSpaceDeletedToast();

    if (adminEmail && adminPassword) {
      await nav.logout();
      await new AuthPage(page).loginExpectSuccess(adminEmail, adminPassword);
      await nav.goToAdmin();
      await adminPage.openUsersTab();
      await adminPage.searchUsers(invitedUserEmail);
      await adminPage.deleteUser(invitedUserEmail);
    }
  });
});
