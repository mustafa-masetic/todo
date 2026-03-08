import { expect, type Page } from "@playwright/test";

export class SpacesPage {
  constructor(private readonly page: Page) {}

  async createSpace(name: string, description: string) {
    await this.page.getByTestId("spaces-create-button").click();
    await this.page.getByTestId("create-space-name-input").fill(name);
    await this.page.getByTestId("create-space-description-input").fill(description);
    await this.page.getByTestId("create-space-submit-button").click();
  }

  async searchSpaces(query: string) {
    await this.page.getByTestId("spaces-search-input").fill(query);
  }

  async openSpaceByName(name: string) {
    await this.page.getByText(name, { exact: true }).first().click();
  }

  async expectSpaceVisible(name: string) {
    await expect(this.page.getByText(name, { exact: true }).first()).toBeVisible();
  }

  async expectNoMatchingSpaces() {
    await expect(this.page.getByText("No spaces match your search.")).toBeVisible();
  }
}
