import { expect, type Page } from "@playwright/test";

const SEARCH_TYPE_DELAY_MS = 35;
const SEARCH_SETTLE_MS = 450;

export class SpacesPage {
  constructor(private readonly page: Page) {}

  async createSpace(name: string, description: string) {
    await this.page.getByTestId("spaces-create-button").click();
    await this.page.getByTestId("create-space-name-input").fill(name);
    await this.page.getByTestId("create-space-description-input").fill(description);
    await this.page.getByTestId("create-space-submit-button").click();
  }

  async searchSpaces(query: string) {
    const input = this.page.getByTestId("spaces-search-input");
    await input.click();
    await input.fill("");
    await input.pressSequentially(query, { delay: SEARCH_TYPE_DELAY_MS });
    await expect(input).toHaveValue(query);
    await this.page.waitForTimeout(SEARCH_SETTLE_MS);
  }

  async openSpaceByName(name: string) {
    await this.page.getByText(name, { exact: true }).first().click();
  }

  async expectSpaceVisible(name: string) {
    await expect(this.page.getByText(name, { exact: true }).first()).toBeVisible();
  }

  async expectNoMatchingSpaces() {
    const noMatchState = this.page.getByText("No spaces match your search.");
    const noSpacesState = this.page.getByText("No spaces yet. Create one to get started.");
    await expect(noMatchState.or(noSpacesState).first()).toBeVisible();
  }

  async deleteCurrentSpace() {
    await this.page.getByRole("button", { name: "Delete space" }).click();
    await this.page.getByTestId("delete-space-confirm-button").click();
  }

  async expectSpaceDeletedToast() {
    await expect(this.page.getByText("Space deleted")).toBeVisible();
  }
}
