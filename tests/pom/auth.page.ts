import { expect, type Page } from "@playwright/test";

export class AuthPage {
  constructor(private readonly page: Page) {}

  private async expectAuthenticatedUi() {
    const accountMenuButton = this.page.getByTestId("nav-account-menu-button");
    const mobileMenuToggle = this.page.getByTestId("nav-mobile-menu-toggle");

    await expect
      .poll(
        async () => (await accountMenuButton.isVisible()) || (await mobileMenuToggle.isVisible()),
        {
          timeout: 10_000,
          message: "Expected authenticated navigation controls to become visible after authentication."
        }
      )
      .toBeTruthy();
  }

  async gotoLogin() {
    await this.page.goto("/login");
  }

  async gotoRegister() {
    await this.page.goto("/register");
    await this.page.waitForLoadState("networkidle");

    const firstNameInput = this.page.getByTestId("auth-first-name-input");
    const accountMenuButton = this.page.getByTestId("nav-account-menu-button");

    if (await accountMenuButton.isVisible().catch(() => false)) {
      return;
    }

    if (await firstNameInput.isVisible().catch(() => false)) {
      return;
    }

    const registerToggle = this.page
      .getByTestId("hero-register-button")
      .or(this.page.getByRole("button", { name: "Register" }))
      .first();

    if (await registerToggle.isVisible().catch(() => false)) {
      await registerToggle.click();
      await expect(firstNameInput).toBeVisible();
    }
  }

  async login(
    email: string,
    password: string,
    options?: {
      waitForAuthenticatedUi?: boolean;
    }
  ) {
    await this.page.getByTestId("auth-email-input").fill(email);
    await this.page.getByTestId("auth-password-input").fill(password);
    await this.page.getByTestId("auth-submit-button").click();

    if (options?.waitForAuthenticatedUi ?? true) {
      await this.expectAuthenticatedUi();
    }
  }

  async register(
    params: {
      firstName: string;
      lastName: string;
      email: string;
      gender?: "Female" | "Male" | "Other" | "Prefer not to say";
      password: string;
    },
    options?: {
      waitForAuthenticatedUi?: boolean;
    }
  ) {
    const firstNameInput = this.page.getByTestId("auth-first-name-input");
    const accountMenuButton = this.page.getByTestId("nav-account-menu-button");

    if (await accountMenuButton.isVisible().catch(() => false)) {
      return;
    }

    if (!(await firstNameInput.isVisible().catch(() => false))) {
      const registerToggle = this.page
        .getByTestId("hero-register-button")
        .or(this.page.getByRole("button", { name: "Register" }))
        .first();
      await registerToggle.click();
    }

    await expect(firstNameInput).toBeVisible();
    await firstNameInput.fill(params.firstName);
    await this.page.getByTestId("auth-last-name-input").fill(params.lastName);
    await this.page.getByTestId("auth-email-input").fill(params.email);

    const gender = params.gender ?? "Other";
    await this.page.getByTestId("auth-gender-select").click();
    await this.page.getByRole("option", { name: gender }).click();

    await this.page.getByTestId("auth-password-input").fill(params.password);
    await this.page.getByTestId("auth-submit-button").click();

    if (options?.waitForAuthenticatedUi ?? true) {
      await this.expectAuthenticatedUi();
    }
  }
}
