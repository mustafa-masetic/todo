import type { Browser } from "@playwright/test";
import { AdminPage } from "../pom/admin.page";
import { AuthPage } from "../pom/auth.page";
import { NavigationComponent } from "../pom/navigation.component";

const adminEmail = process.env.E2E_EMAIL;
const adminPassword = process.env.E2E_PASSWORD;

export async function deleteUserAsAdmin(
  browser: Browser,
  baseURL: string | undefined,
  email: string
) {
  if (!adminEmail || !adminPassword || !baseURL) {
    return;
  }

  const context = await browser.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] }
  });
  const page = await context.newPage();
  const authPage = new AuthPage(page);
  const nav = new NavigationComponent(page);
  const adminPage = new AdminPage(page);

  await authPage.loginExpectSuccess(adminEmail, adminPassword);
  await nav.goToAdmin();
  await adminPage.openUsersTab();
  await adminPage.searchUsers(email);
  await adminPage.deleteUser(email);
  await context.close();
}
