import { expect, type Page } from "@playwright/test";

export class HomePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/");
  }

  async expectOverviewVisible() {
    await expect(this.page.getByText("Your overview")).toBeVisible();
  }
}
