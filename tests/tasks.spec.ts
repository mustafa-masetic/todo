import { randomUUID } from "node:crypto";
import { test } from "./fixtures/auth-session";
import { NavigationComponent } from "./pom/navigation.component";
import { SpacesPage } from "./pom/spaces.page";
import { TaskDetailPage } from "./pom/task-detail.page";
import { ensurePageLoaded } from "./utils/page";

test.describe("Tasks", () => {
  test.use({
    authSession: {
      mode: "register",
      email: "playwright.tasks@example.com",
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
});
