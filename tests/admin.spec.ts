import { expect, test } from "@playwright/test";
import { AdminPage } from "./pom/admin.page";
import { AuthPage } from "./pom/auth.page";
import { NavigationComponent } from "./pom/navigation.component";
import { SpacesPage } from "./pom/spaces.page";
import { TaskDetailPage } from "./pom/task-detail.page";

test.describe("Admin", () => {
  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPage(page);
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;

    test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run admin tests.");

    await authPage.gotoLogin();
    await authPage.login(email as string, password as string);
  });

  test("admin can edit a user and validate password reset modal", async ({ page }) => {
    const nav = new NavigationComponent(page);
    const adminPage = new AdminPage(page);
    const unique = Date.now();
    const email = process.env.E2E_EMAIL as string;
    const updatedFirst = "Updated";
    const updatedLast = `Admin${unique}`;

    await nav.goToAdmin();
    await adminPage.expectVisible();
    await adminPage.searchUsers(email);

    await adminPage.openUserEdit(email);
    await adminPage.saveUserEdit({ firstName: updatedFirst, lastName: updatedLast });
    await expect(adminPage.userRow(email)).toContainText(`${updatedFirst} ${updatedLast}`);

    await adminPage.openUserPasswordReset(email);
    await adminPage.submitPasswordReset("short");
    await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
  });

  test.only("admin can edit a space from the spaces tab", async ({ page }) => {
    const nav = new NavigationComponent(page);
    const adminPage = new AdminPage(page);
    const spacesPage = new SpacesPage(page);
    const unique = Date.now();
    const originalName = `Admin Space ${unique}`;
    const updatedName = `Admin Space Updated ${unique}`;

    await nav.goToSpaces();
    await spacesPage.createSpace(originalName, "Created for admin editing");
    await nav.goToAdmin();
    await adminPage.openSpacesTab();
    await adminPage.searchSpaces(originalName);
    //await page.pause();
    await adminPage.openSpaceEdit(originalName);
    await adminPage.saveSpaceEdit({
      name: updatedName,
      description: "Updated from admin modal"
    });

    await expect(adminPage.spaceRow(updatedName)).toBeVisible();
  });

  test("admin can edit a task and change status from the task modal", async ({ page }) => {
    const nav = new NavigationComponent(page);
    const adminPage = new AdminPage(page);
    const spacesPage = new SpacesPage(page);
    const taskDetail = new TaskDetailPage(page);
    const unique = Date.now();
    const spaceName = `Admin Task Space ${unique}`;
    const originalTitle = `Admin Task ${unique}`;
    const updatedTitle = `Admin Task Updated ${unique}`;

    await nav.goToSpaces();
    await spacesPage.createSpace(spaceName, "Admin task editing");
    await spacesPage.openSpaceByName(spaceName);
    await taskDetail.addTask({
      title: originalTitle,
      description: "Original task description"
    });

    await nav.goToAdmin();
    await adminPage.openTasksTab();
    await adminPage.searchTasks(originalTitle);

    await adminPage.openTaskEdit(originalTitle);
    await adminPage.saveTaskEdit({
      title: updatedTitle,
      description: "Updated from admin modal",
      status: "Done"
    });

    await expect(adminPage.taskRow(updatedTitle)).toContainText("Done");
  });
});
