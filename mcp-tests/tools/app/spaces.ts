import type { Page } from "@playwright/test";

export async function openSpace(page: Page, spaceName: string): Promise<void> {
  await page.getByRole("link", { name: spaceName }).click();
}

export async function createSpace(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /create space/i }).click();
  await page.getByLabel(/space name/i).fill(name);
  await page.getByRole("button", { name: /create/i }).click();
  // TODO: Expand this flow if the UI requires additional fields or confirmation steps.
}
