import { expect, type Locator, type Page } from "@playwright/test";

export class NavigationComponent {
  constructor(private readonly page: Page) {}

  homeButton() {
    return this.page.getByTestId("nav-home-button");
  }

  loginButton() {
    return this.page.getByTestId("nav-login-button");
  }

  themeToggle() {
    return this.page.getByTestId("nav-theme-toggle");
  }

  searchTrigger(): Locator {
    return this.page
      .getByTestId("nav-search-button")
      .or(this.page.getByTestId("nav-search-icon-button"))
      .first();
  }

  async expectLoggedOutHeaderVisible() {
    await expect(this.homeButton()).toBeVisible();
    await expect(this.loginButton()).toBeVisible();
    await expect(this.themeToggle()).toBeVisible();
  }

  async openGlobalSearch() {
    await expect(this.searchTrigger()).toBeVisible();
    await this.searchTrigger().click();
  }

  async logout() {
    const mobileToggle = this.page
      .getByTestId("nav-mobile-menu-toggle")
      .or(this.page.getByRole("button", { name: "Open navigation menu" }))
      .first();
    if (await mobileToggle.isVisible()) {
      await mobileToggle.click();
      const drawerLogout = this.page.getByTestId("drawer-logout-button");
      if (await drawerLogout.isVisible()) {
        await drawerLogout.click();
        return;
      }
    }

    const accountMenuButton = this.page.getByTestId("nav-account-menu-button");
    if (await accountMenuButton.isVisible()) {
      await accountMenuButton.click();
      await this.page
        .getByTestId("menu-logout")
        .or(this.page.getByRole("menuitem", { name: "Logout" }))
        .first()
        .click();
      return;
    }
  }

  async goToSpaces() {
    try {
      await this.page
        .getByRole("banner")
        .getByRole("button", { name: "Spaces", exact: true })
        .first()
        .click({ timeout: 7_000 });
      return;
    } catch {
      // Fall back to mobile drawer navigation.
    }

    const mobileToggle = this.page
      .getByTestId("nav-mobile-menu-toggle")
      .or(this.page.getByRole("button", { name: "Open navigation menu" }))
      .first();
    await mobileToggle.click({ timeout: 10_000 });
    await this.page
      .getByTestId("drawer-spaces-button")
      .or(this.page.getByRole("button", { name: "Spaces" }))
      .first()
      .click();
  }

  async goToTasks() {
    try {
      await this.page
        .getByRole("banner")
        .getByRole("button", { name: "Tasks", exact: true })
        .first()
        .click({ timeout: 7_000 });
      return;
    } catch {
      // Fall back to mobile drawer navigation.
    }

    const mobileToggle = this.page
      .getByTestId("nav-mobile-menu-toggle")
      .or(this.page.getByRole("button", { name: "Open navigation menu" }))
      .first();
    await mobileToggle.click({ timeout: 10_000 });
    await this.page
      .getByTestId("drawer-tasks-button")
      .or(this.page.getByRole("button", { name: "Tasks" }))
      .first()
      .click();
  }
}
