import { randomUUID } from "node:crypto";
import { expect, test } from "./fixtures/auth-session";
import { AdminPage } from "./pom/admin.page";
import { AuthPage } from "./pom/auth.page";
import { NavigationComponent } from "./pom/navigation.component";
import { SpacesPage } from "./pom/spaces.page";
import { deleteUserAsAdmin } from "./utils/admin-cleanup";
import { ensurePageLoaded } from "./utils/page";

const adminEmail = process.env.E2E_EMAIL;
const adminPassword = process.env.E2E_PASSWORD;
const suiteEmail = "playwright.invites.owner@example.com";

async function registerInvitee(
  browser: import("@playwright/test").Browser,
  baseURL: string | undefined,
  unique: string
) {
  const email = `playwright.invitee.${unique}@example.com`;
  const password = "TestPass123!";
  const context = await browser.newContext({
    baseURL: baseURL ?? undefined,
    storageState: { cookies: [], origins: [] }
  });
  const page = await context.newPage();
  const authPage = new AuthPage(page);

  await authPage.gotoRegister();
  await authPage.register({
    email,
    firstName: "Invitee",
    lastName: unique.slice(0, 8),
    gender: "Other",
    password
  });

  return { context, page, email };
}

test.describe("Invites", () => {
  test.use({
    authSession: {
      mode: "register",
      email: suiteEmail,
      firstName: "Invite",
      lastName: "Owner",
      gender: "Other",
      password: "TestPass123!"
    }
  });

  test("accepts an invitation from the review modal", async ({ page, browser, baseURL }) => {
    const adminPage = new AdminPage(page);
    const nav = new NavigationComponent(page);
    const spacesPage = new SpacesPage(page);
    const unique = randomUUID();
    const spaceName = `PW Invite Accept ${unique}`;
    const invitee = await registerInvitee(browser, baseURL, `${unique}-accept`);

    await ensurePageLoaded(page);
    await nav.themeToggle().waitFor({ state: "visible" });
    await nav.goToSpaces();
    await spacesPage.createSpace(spaceName, "Accept invite coverage");
    await spacesPage.openSpaceByName(spaceName);
    await page.getByRole("tab", { name: /Members \(/ }).click();
    await page.getByTestId("space-invite-people-button").click();
    const inviteModal = page.getByTestId("invite-modal");
    await inviteModal.getByTestId("invite-search-input").fill(invitee.email);
    await expect(inviteModal.getByText(invitee.email, { exact: true })).toBeVisible();
    await inviteModal.getByRole("button", { name: "Invite" }).click();
    await expect(page.getByText("Invite sent")).toBeVisible();

    await invitee.page.goto("/");
    await expect(invitee.page.getByText(spaceName, { exact: true })).toBeVisible();
    await invitee.page.locator('[data-test-id^="invitation-preview-button-"]').first().click();
    await invitee.page.getByTestId("invitation-accept-button").click();
    await expect(invitee.page.getByText("Invite accepted")).toBeVisible();

    const inviteeNav = new NavigationComponent(invitee.page);
    const inviteeSpaces = new SpacesPage(invitee.page);
    await inviteeNav.goToSpaces();
    await inviteeSpaces.searchSpaces(spaceName);
    await inviteeSpaces.expectSpaceVisible(spaceName);

    await invitee.context.close();

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
      await adminPage.searchUsers(invitee.email);
      await adminPage.deleteUser(invitee.email);
    }
  });

  test("declines an invitation from the review modal", async ({ page, browser, baseURL }) => {
    const adminPage = new AdminPage(page);
    const nav = new NavigationComponent(page);
    const spacesPage = new SpacesPage(page);
    const unique = randomUUID();
    const spaceName = `PW Invite Decline ${unique}`;
    const invitee = await registerInvitee(browser, baseURL, `${unique}-decline`);

    await ensurePageLoaded(page);
    await nav.themeToggle().waitFor({ state: "visible" });
    await nav.goToSpaces();
    await spacesPage.createSpace(spaceName, "Decline invite coverage");
    await spacesPage.openSpaceByName(spaceName);
    await page.getByRole("tab", { name: /Members \(/ }).click();
    await page.getByTestId("space-invite-people-button").click();
    const declineInviteModal = page.getByTestId("invite-modal");
    await declineInviteModal.getByTestId("invite-search-input").fill(invitee.email);
    await expect(declineInviteModal.getByText(invitee.email, { exact: true })).toBeVisible();
    await declineInviteModal.getByRole("button", { name: "Invite" }).click();
    await expect(page.getByText("Invite sent")).toBeVisible();

    await invitee.page.goto("/");
    await expect(invitee.page.getByText(spaceName, { exact: true })).toBeVisible();
    await invitee.page.locator('[data-test-id^="invitation-preview-button-"]').first().click();
    const reviewModal = invitee.page.getByRole("dialog", { name: "Review invitation" });
    await reviewModal.getByRole("button", { name: "Decline" }).click();
    await expect(reviewModal).toBeHidden();
    await expect(invitee.page.getByText(spaceName, { exact: true })).toHaveCount(0);

    const inviteeNav = new NavigationComponent(invitee.page);
    const inviteeSpaces = new SpacesPage(invitee.page);
    await inviteeNav.goToSpaces();
    await inviteeSpaces.searchSpaces(spaceName);
    await inviteeSpaces.expectNoMatchingSpaces();

    await invitee.context.close();

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
      await adminPage.searchUsers(invitee.email);
      await adminPage.deleteUser(invitee.email);
    }
  });

  test.afterAll(async ({ browser, baseURL }) => {
    await deleteUserAsAdmin(browser, baseURL, suiteEmail);
  });
});
