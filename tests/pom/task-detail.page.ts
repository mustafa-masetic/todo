import { expect, type Page } from "@playwright/test";

export class TaskDetailPage {
  constructor(private readonly page: Page) {}

  private async expectAndDismissToast(testId: string) {
    const toast = this.page.getByTestId(testId).last();

    await expect(toast).toBeVisible();
    await toast.getByRole("button").click();
    await expect(toast).toBeHidden();
  }

  async addTask(params: { title: string; description: string }) {
    await this.page.getByTestId("space-add-task-button").click();
    await this.page.getByTestId("add-task-title-input").fill(params.title);
    await this.page.getByTestId("add-task-description-input").fill(params.description);
    await this.page.getByTestId("add-task-submit-button").click();
  }

  async openTaskByTitle(title: string) {
    await this.page.getByText(title, { exact: true }).first().click();
  }

  async setStatus(status: "Created" | "In Progress" | "Done") {
    await this.page.getByTestId("task-status-select").click();
    await this.page.getByRole("option", { name: status }).click();
  }

  async saveChanges() {
    await this.page.getByTestId("task-save-button").click();
  }

  async expectTaskVisible(title: string) {
    await expect(this.page.getByText(title, { exact: true }).first()).toBeVisible();
  }

  async expectTaskUpdatedToast() {
    await this.expectAndDismissToast("task-updated-toast");
  }

  async deleteTask() {
    await this.page.getByTestId("task-delete-button").click();
    await this.page.getByTestId("delete-task-confirm-button").click();
  }

  async expectTaskDeletedToast() {
    await this.expectAndDismissToast("task-deleted-toast");
  }
}
