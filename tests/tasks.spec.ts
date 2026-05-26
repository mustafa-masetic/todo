import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { AuthPage } from "./pom/auth.page";
import { NavigationComponent } from "./pom/navigation.component";
import { SpacesPage } from "./pom/spaces.page";
import { TaskDetailPage } from "./pom/task-detail.page";
import { ensurePageLoaded } from "./utils/page";

test.describe("Tasks", () => {
  test("creates a task and updates its status", async ({ page }) => {
    const unique = randomUUID();
    await new AuthPage(page).register({ firstName: "Task", lastName: "Tester", email: `playwright.tasks.${unique}@example.com`, password: "TestPass123!" });

    const nav = new NavigationComponent(page);
    const spacesPage = new SpacesPage(page);
    const taskDetail = new TaskDetailPage(page);
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
    await taskDetail.enterEditMode();
    await taskDetail.setStatus("Done");
    await taskDetail.saveChanges();
    await taskDetail.expectTaskUpdatedToast();

    await page.screenshot({ path: "task-updated.png" });

    await taskDetail.deleteTask();
    await taskDetail.expectTaskDeletedToast();
  });

  test("creates and deletes a task", async ({ page }) => {
    const unique = randomUUID();
    await new AuthPage(page).register({ firstName: "Task", lastName: "Tester", email: `playwright.tasks.${unique}@example.com`, password: "TestPass123!" });

    const nav = new NavigationComponent(page);
    const spacesPage = new SpacesPage(page);
    const taskDetail = new TaskDetailPage(page);
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
    const unique = randomUUID();
    await new AuthPage(page).register({ firstName: "Task", lastName: "Tester", email: `playwright.tasks.${unique}@example.com`, password: "TestPass123!" });

    const nav = new NavigationComponent(page);
    const spacesPage = new SpacesPage(page);
    const taskDetail = new TaskDetailPage(page);
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
    await taskDetail.enterEditMode();
    await taskDetail.setStatus("In Progress");
    await taskDetail.saveChanges();
    await taskDetail.expectTaskUpdatedToast();
    await page.goBack();
    await taskDetail.expectTaskVisible(doneTitle);

    await taskDetail.openTaskByTitle(doneTitle);
    await taskDetail.enterEditMode();
    await taskDetail.setStatus("Done");
    await taskDetail.saveChanges();
    await taskDetail.expectTaskUpdatedToast();
    await page.goBack();
    await taskDetail.expectTaskVisible(doneTitle);

    await nav.goToTasks();

    await expect(page.getByTestId("tasks-stat-completed-value")).toHaveText("1", { timeout: 15000 });

    await page.getByTestId("tasks-stat-completed").click();
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

});
