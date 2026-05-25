import { randomUUID } from "node:crypto";
import { expect, test } from "./fixtures/auth-session";
import { NavigationComponent } from "./pom/navigation.component";
import { SpacesPage } from "./pom/spaces.page";
import { TaskDetailPage } from "./pom/task-detail.page";
import { deleteUserAsAdmin } from "./utils/admin-cleanup";
import { ensurePageLoaded } from "./utils/page";

const suiteEmail = "playwright.tasks@example.com";

test.describe("Tasks", () => {
  test.use({
    authSession: {
      mode: "register",
      email: suiteEmail,
      firstName: "Task",
      lastName: "Tester",
      gender: "Other",
      password: "TestPass123!"
    }
  });

  test("creates a task and updates its status", async ({ page }) => {
    const nav = new NavigationComponent(page);
    const spacesPage = new SpacesPage(page);
    const taskDetail = new TaskDetailPage(page);
    const unique = randomUUID();
    const spaceName = `PW Task Space ${unique}`;
    const taskTitle = `PW Task ${unique}`;

    await ensurePageLoaded(page);
    await nav.themeToggle().waitFor({ state: "visible" });
    await nav.goToSpaces();
    await spacesPage.createSpace(spaceName, "Task flow space");
    await spacesPage.openSpaceByName(spaceName);

    await taskDetail.addTask({
      title: taskTitle,
      description: "Task created by Playwright test"
    });
    await taskDetail.expectTaskVisible(taskTitle);

    await taskDetail.openTaskByTitle(taskTitle);
    await taskDetail.setStatus("Done");
    await taskDetail.saveChanges();
    await taskDetail.expectTaskUpdatedToast();

    await page.screenshot({ path: "task-updated.png" });

    await taskDetail.deleteTask();
    await taskDetail.expectTaskDeletedToast();
  });

  test("creates and deletes a task", async ({ page }) => {
    const nav = new NavigationComponent(page);
    const spacesPage = new SpacesPage(page);
    const taskDetail = new TaskDetailPage(page);
    const unique = randomUUID();
    const spaceName = `PW Task Delete Space ${unique}`;
    const taskTitle = `PW Task Delete ${unique}`;

    await ensurePageLoaded(page);
    await nav.themeToggle().waitFor({ state: "visible" });
    await nav.goToSpaces();
    await spacesPage.createSpace(spaceName, "Delete task flow");
    await spacesPage.openSpaceByName(spaceName);

    await taskDetail.addTask({
      title: taskTitle,
      description: "Task that should be deleted"
    });
    await taskDetail.expectTaskVisible(taskTitle);

    await taskDetail.openTaskByTitle(taskTitle);
    await taskDetail.deleteTask();
    await taskDetail.expectTaskDeletedToast();
  });

  test("task dashboard stat tiles sync with status filter and table", async ({ page }) => {
    const nav = new NavigationComponent(page);
    const spacesPage = new SpacesPage(page);
    const taskDetail = new TaskDetailPage(page);
    const unique = randomUUID();
    const spaceName = `PW Dashboard Space ${unique}`;
    const createdTitle = `PW Created ${unique}`;
    const inProgressTitle = `PW Progress ${unique}`;
    const doneTitle = `PW Done ${unique}`;

    await ensurePageLoaded(page);
    await nav.themeToggle().waitFor({ state: "visible" });
    await nav.goToSpaces();
    await spacesPage.createSpace(spaceName, "Dashboard filter coverage");
    await spacesPage.openSpaceByName(spaceName);

    await taskDetail.addTask({
      title: createdTitle,
      description: "Created status task"
    });
    await taskDetail.addTask({
      title: inProgressTitle,
      description: "In progress status task"
    });
    await taskDetail.addTask({
      title: doneTitle,
      description: "Done status task"
    });

    await taskDetail.openTaskByTitle(inProgressTitle);
    await taskDetail.setStatus("In Progress");
    await taskDetail.saveChanges();
    await taskDetail.expectTaskUpdatedToast();
    await page.goBack();

    await taskDetail.openTaskByTitle(doneTitle);
    await taskDetail.setStatus("Done");
    await taskDetail.saveChanges();
    await taskDetail.expectTaskUpdatedToast();
    await page.goBack();

    await nav.goToTasks();

    await page.getByText("Completed", { exact: true }).first().click();
    await expect(page.getByTestId("tasks-status-filter")).toHaveValue("Done");
    await expect(page.getByText(doneTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(createdTitle, { exact: true })).toHaveCount(0);
    await expect(page.getByText(inProgressTitle, { exact: true })).toHaveCount(0);

    await page.getByText("In Progress", { exact: true }).first().click();
    await expect(page.getByTestId("tasks-status-filter")).toHaveValue("In Progress");
    await expect(page.getByText(inProgressTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(createdTitle, { exact: true })).toHaveCount(0);
    await expect(page.getByText(doneTitle, { exact: true })).toHaveCount(0);

    await nav.goToSpaces();
    await spacesPage.openSpaceByName(spaceName);
    await spacesPage.deleteCurrentSpace();
    await spacesPage.expectSpaceDeletedToast();
  });

  test.afterAll(async ({ browser, baseURL }) => {
    await deleteUserAsAdmin(browser, baseURL, suiteEmail);
  });
});
