import { expect, type Locator, type Page } from "@playwright/test";

export class NavigationComponent {
  constructor(private readonly page: Page) {}

  private async ensureAppLoaded() {
    if (this.page.url() === "about:blank") {
      await this.page.goto("/");
    }
  }

  navigationDialog() {
    return this.page.getByRole("dialog", { name: "Navigation" });
  }

  async closeNavigationDrawerIfOpen() {
    const dialog = this.navigationDialog();
    if (await dialog.isVisible()) {
      try {
        await expect(dialog).toBeHidden({ timeout: 1000 });
        return;
      } catch {
        await dialog.getByTestId("drawer-close-button").click();
        await expect(dialog).toBeHidden();
      }
    }
  }

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
    await this.ensureAppLoaded();
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
      try {
        await drawerLogout.waitFor({ state: "visible", timeout: 1000 });
        await drawerLogout.click();
        return;
      } catch {
        await this.page.keyboard.press("Escape");
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
    await this.ensureAppLoaded();
    const desktopSpaces = this.page.getByTestId("nav-spaces-button");
    const mobileToggle = this.page.getByTestId("nav-mobile-menu-toggle");

    await expect
      .poll(
        async () =>
          (await desktopSpaces.isVisible()) || (await mobileToggle.isVisible()),
        {
          timeout: 5000,
          message: "Expected desktop Spaces navigation or mobile menu toggle to become visible."
        }
      )
      .toBeTruthy();

    if (await desktopSpaces.isVisible()) {
      await desktopSpaces.click();
      return;
    }

    if (!(await mobileToggle.isVisible())) {
      throw new Error("Neither desktop nor mobile Spaces navigation is visible.");
    }
    await mobileToggle.click();
    await this.page.getByTestId("drawer-spaces-button").click();
    await this.closeNavigationDrawerIfOpen();
  }

  async goToTasks() {
    await this.ensureAppLoaded();
    const desktopTasks = this.page.getByTestId("nav-tasks-button");
    const mobileToggle = this.page.getByTestId("nav-mobile-menu-toggle");

    await expect
      .poll(
        async () =>
          (await desktopTasks.isVisible()) || (await mobileToggle.isVisible()),
        {
          timeout: 5000,
          message: "Expected desktop Tasks navigation or mobile menu toggle to become visible."
        }
      )
      .toBeTruthy();

    if (await desktopTasks.isVisible()) {
      await desktopTasks.click();
      return;
    }

    if (!(await mobileToggle.isVisible())) {
      throw new Error("Neither desktop nor mobile Tasks navigation is visible.");
    }
    await mobileToggle.click();
    await this.page.getByTestId("drawer-tasks-button").click();
    await this.closeNavigationDrawerIfOpen();
  }

  async goToAdmin() {
    await this.ensureAppLoaded();
    const desktopAdmin = this.page.getByTestId("nav-admin-button");
    const mobileToggle = this.page.getByTestId("nav-mobile-menu-toggle");
    const accountMenuButton = this.page.getByTestId("nav-account-menu-button");

    await expect
      .poll(
        async () =>
          (await desktopAdmin.isVisible()) ||
          (await mobileToggle.isVisible()) ||
          (await accountMenuButton.isVisible()),
        {
          timeout: 5000,
          message: "Expected logged-in navigation controls to become visible."
        }
      )
      .toBeTruthy();

    if (await desktopAdmin.isVisible()) {
      await desktopAdmin.click();
      return;
    }

    if (!(await mobileToggle.isVisible())) {
      throw new Error(
        "Admin navigation is not visible for the logged-in user. This account is likely not an admin."
      );
    }
    await mobileToggle.click();
    const drawerAdmin = this.page.getByTestId("drawer-admin-button");
    try {
      await drawerAdmin.waitFor({ state: "visible", timeout: 2000 });
    } catch {
      throw new Error(
        "Admin navigation is not visible in the mobile drawer. This account is likely not an admin."
      );
    }
    await drawerAdmin.click();
    await this.closeNavigationDrawerIfOpen();
  }
}
