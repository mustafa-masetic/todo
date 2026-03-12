import { expect, type Locator, type Page } from "@playwright/test";

const SEARCH_TYPE_DELAY_MS = 35;
const SEARCH_SETTLE_MS = 450;

export class AdminPage {
  constructor(private readonly page: Page) {}

  async expectVisible() {
    await expect(this.page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
  }

  async openUsersTab() {
    await this.page.getByRole("tab", { name: "Users" }).click();
  }

  async openSpacesTab() {
    await this.page.getByRole("tab", { name: "Spaces" }).click();
  }

  async openTasksTab() {
    await this.page.getByRole("tab", { name: "Tasks" }).click();
  }

  async searchUsers(value: string) {
    const input = this.page.getByPlaceholder("Search users...");
    await input.click();
    await input.fill("");
    await input.pressSequentially(value, { delay: SEARCH_TYPE_DELAY_MS });
    await expect(input).toHaveValue(value);
    await this.page.waitForTimeout(SEARCH_SETTLE_MS);
  }

  async searchSpaces(value: string) {
    const input = this.page.getByPlaceholder("Search spaces...");
    await input.click();
    await input.fill("");
    await input.pressSequentially(value, { delay: SEARCH_TYPE_DELAY_MS });
    await expect(input).toHaveValue(value);
    await this.page.waitForTimeout(SEARCH_SETTLE_MS);
  }

  async searchTasks(value: string) {
    const input = this.page.getByPlaceholder("Search tasks...");
    await input.click();
    await input.fill("");
    await input.pressSequentially(value, { delay: SEARCH_TYPE_DELAY_MS });
    await expect(input).toHaveValue(value);
    await this.page.waitForTimeout(SEARCH_SETTLE_MS);
  }

  userRow(email: string): Locator {
    return this.page.locator("tr").filter({ hasText: email }).first();
  }

  spaceRow(name: string): Locator {
    return this.page.locator("tr").filter({ hasText: name }).first();
  }

  taskRow(title: string): Locator {
    return this.page.locator("tr").filter({ hasText: title }).first();
  }

  async openUserEdit(email: string) {
    await this.userRow(email).getByLabel("Edit user").click();
    await expect(this.page.getByRole("dialog", { name: "Edit user" })).toBeVisible();
  }

  async saveUserEdit(params: { firstName: string; lastName: string }) {
    const dialog = this.page.getByRole("dialog", { name: "Edit user" });
    await dialog.getByLabel("First name").fill(params.firstName);
    await dialog.getByLabel("Last name").fill(params.lastName);
    await dialog.getByRole("button", { name: "Save changes" }).click();
  }

  async openUserPasswordReset(email: string) {
    await this.userRow(email).getByLabel("Reset password").click();
    await expect(this.page.getByRole("dialog", { name: "Reset password" })).toBeVisible();
  }

  async submitPasswordReset(password: string) {
    const dialog = this.page.getByRole("dialog", { name: "Reset password" });
    await dialog.getByLabel("New password").fill(password);
    await dialog.getByRole("button", { name: "Reset password" }).click();
  }

  async openSpaceEdit(name: string) {
    await this.spaceRow(name).getByLabel("Edit space").click();
    await expect(this.page.getByRole("dialog", { name: "Edit space" })).toBeVisible();
  }

  async saveSpaceEdit(params: { name: string; description: string }) {
    const dialog = this.page.getByRole("dialog", { name: "Edit space" });
    await dialog.getByLabel("Space name").fill(params.name);
    await dialog.getByLabel("Description").fill(params.description);
    await dialog.getByRole("button", { name: "Save changes" }).click();
  }

  async openTaskEdit(title: string) {
    await this.taskRow(title).getByLabel("Edit task").click();
    await expect(this.page.getByRole("dialog", { name: "Edit task" })).toBeVisible();
  }

  async saveTaskEdit(params: { title: string; description: string; status: "Created" | "In Progress" | "Done" }) {
    const dialog = this.page.getByRole("dialog", { name: "Edit task" });
    await dialog.getByLabel("Task title").fill(params.title);
    await dialog.getByLabel("Description").fill(params.description);
    await dialog.getByLabel("Status").click();
    await this.page.getByRole("option", { name: params.status }).click();
    await dialog.getByRole("button", { name: "Save changes" }).click();
  }
}
