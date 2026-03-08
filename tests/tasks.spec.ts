import { test } from "@playwright/test";
import { AuthPage } from "./pom/auth.page";
import { NavigationComponent } from "./pom/navigation.component";
import { SpacesPage } from "./pom/spaces.page";
import { TaskDetailPage } from "./pom/task-detail.page";

test.describe("Tasks", () => {
  test("creates a task and updates its status", async ({ page }) => {
    const authPage = new AuthPage(page);
    const nav = new NavigationComponent(page);
    const spacesPage = new SpacesPage(page);
    const taskDetail = new TaskDetailPage(page);
    const unique = Date.now();
    const email = `playwright.tasks.${unique}@example.com`;
    const spaceName = `PW Task Space ${unique}`;
    const taskTitle = `PW Task ${unique}`;

    await authPage.gotoRegister();
    await authPage.register({
      firstName: "Task",
      lastName: "Tester",
      email,
      gender: "Other",
      password: "TestPass123!"
    });

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
  });
});
