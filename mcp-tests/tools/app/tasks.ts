import type { Page } from "@playwright/test";

export async function createTask(
  page: Page,
  title: string,
  status: string,
  assignee?: string,
): Promise<void> {
  await page.getByRole("button", { name: /new task|create task/i }).click();
  await page.getByLabel(/title/i).fill(title);
  await page.getByLabel(/status/i).selectOption({ label: status });

  if (assignee) {
    await page.getByLabel(/assignee/i).selectOption({ label: assignee });
  }

  await page.getByRole("button", { name: /create|save/i }).click();
}
