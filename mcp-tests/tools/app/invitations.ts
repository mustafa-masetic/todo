import type { Page } from "@playwright/test";

export async function inviteUserToSpace(page: Page, email: string): Promise<void> {
  await page.getByRole("button", { name: /invite|members/i }).click();
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByRole("button", { name: /send invite|invite/i }).click();
}

export async function acceptInvitation(page: Page, spaceName: string): Promise<void> {
  await page.getByText(spaceName, { exact: false }).click();
  await page.getByRole("button", { name: /accept/i }).click();
}
