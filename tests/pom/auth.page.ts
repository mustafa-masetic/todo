import { expect, type Page } from "@playwright/test";

const TOKEN_KEY = "todo-flow-auth-token";

export class AuthPage {
  constructor(private readonly page: Page) {}

  private async waitForToken() {
    await this.page.waitForFunction(
      (key) => !!localStorage.getItem(key),
      TOKEN_KEY,
      { timeout: 15_000 }
    );
  }

  async expectAuthenticatedUi() {
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

  async login(email: string, password: string) {
    await this.page.goto("/login");
    await this.page.waitForLoadState("networkidle");
    await this.page.getByTestId("auth-email-input").fill(email);
    await this.page.getByTestId("auth-password-input").fill(password);
    await this.page.getByTestId("auth-submit-button").click();
    await this.waitForToken();
  }

  async loginExpectSuccess(email: string, password: string) {
    await this.login(email, password);
    await this.expectAuthenticatedUi();
  }

  async loginExpectFailure(email: string, password: string) {
    await this.page.goto("/login");
    await this.page.waitForLoadState("networkidle");
    await this.page.getByTestId("auth-email-input").fill(email);
    await this.page.getByTestId("auth-password-input").fill(password);
    await this.page.getByTestId("auth-submit-button").click();
    await expect(
      this.page.getByRole("alert").filter({
        has: this.page.getByText("Invalid credentials.")
      })
    ).toBeVisible();
  }

  async register(
    params: {
      firstName: string;
      lastName: string;
      email: string;
      gender?: "Female" | "Male" | "Other" | "Prefer not to say";
      password: string;
    },
    options: { waitForAuthenticatedUi?: boolean } = {}
  ) {
    await this.page.goto("/register");
    await this.page.waitForLoadState("networkidle");
    await this.page.getByTestId("auth-first-name-input").fill(params.firstName);
    await this.page.getByTestId("auth-last-name-input").fill(params.lastName);
    await this.page.getByTestId("auth-email-input").fill(params.email);
    await this.page.getByTestId("auth-gender-select").click();
    await this.page.getByRole("option", { name: params.gender ?? "Other" }).click();
    await this.page.getByTestId("auth-password-input").fill(params.password);
    await this.page.getByTestId("auth-submit-button").click();
    if (options.waitForAuthenticatedUi !== false) {
      await this.page.getByTestId("nav-account-menu-button").waitFor({ state: "visible", timeout: 15_000 });
    }
  }
}
