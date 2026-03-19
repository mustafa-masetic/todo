import type { Page } from "@playwright/test";

export async function verifyUserAccepted(page: Page, email: string): Promise<void> {
  await page.getByText(email, { exact: false }).waitFor();
  await page.getByText(/member|accepted|active/i).waitFor();
}

export async function verifyTaskVisible(page: Page, taskName: string): Promise<void> {
  await page.getByText(taskName, { exact: false }).waitFor();
}
