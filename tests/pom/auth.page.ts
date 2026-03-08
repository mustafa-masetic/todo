import { type Page } from "@playwright/test";

export class AuthPage {
  constructor(private readonly page: Page) {}

  async gotoLogin() {
    await this.page.goto("/login");
  }

  async gotoRegister() {
    await this.page.goto("/register");
  }

  async login(email: string, password: string) {
    await this.page.getByTestId("auth-email-input").fill(email);
    await this.page.getByTestId("auth-password-input").fill(password);
    await this.page.getByTestId("auth-submit-button").click();
  }

  async register(params: {
    firstName: string;
    lastName: string;
    email: string;
    gender?: "Female" | "Male" | "Other" | "Prefer not to say";
    password: string;
  }) {
    await this.page.getByTestId("auth-first-name-input").fill(params.firstName);
    await this.page.getByTestId("auth-last-name-input").fill(params.lastName);
    await this.page.getByTestId("auth-email-input").fill(params.email);

    const gender = params.gender ?? "Other";
    await this.page.getByTestId("auth-gender-select").click();
    await this.page.getByRole("option", { name: gender }).click();

    await this.page.getByTestId("auth-password-input").fill(params.password);
    await this.page.getByTestId("auth-submit-button").click();
  }
}
