import { createHash } from "node:crypto";
import { access, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { expect, test as base } from "@playwright/test";
import { AuthPage } from "../pom/auth.page";

type RegisterAuthSession = {
  mode: "register";
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  gender?: "Female" | "Male" | "Other" | "Prefer not to say";
};

type LoginAuthSession = {
  mode: "login";
  email: string;
  password: string;
};

export type AuthSession = LoginAuthSession | RegisterAuthSession;

const AUTH_STATE_DIR = path.join(process.cwd(), ".playwright", "auth");

function toStorageStatePath(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const slug = normalizedEmail.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "user";
  const hash = createHash("sha1").update(normalizedEmail).digest("hex").slice(0, 8);
  return path.join(AUTH_STATE_DIR, `${slug}-${hash}.json`);
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function hasReusableStorageState(
  browser: import("@playwright/test").Browser,
  baseURL: string,
  storageStatePath: string
) {
  if (!(await fileExists(storageStatePath))) {
    return false;
  }

  const context = await browser.newContext({ baseURL, storageState: storageStatePath, viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  try {
    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");
    return new URL(page.url()).pathname === "/spaces";
  } catch {
    return false;
  } finally {
    await context.close();
  }
}

async function createStorageState(
  browser: import("@playwright/test").Browser,
  baseURL: string,
  authSession: AuthSession,
  storageStatePath: string
) {
  await mkdir(AUTH_STATE_DIR, { recursive: true });

  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const authPage = new AuthPage(page);

  try {
    if (authSession.mode === "login") {
      await authPage.login(authSession.email, authSession.password);
    } else {
      await authPage.register(authSession);
    }

    await page.goto("/spaces");
    await page.waitForLoadState("networkidle");

    if (new URL(page.url()).pathname !== "/spaces") {
      throw new Error(`Auth failed: expected /spaces but got ${page.url()}`);
    }

    await context.storageState({ path: storageStatePath });
  } finally {
    await context.close();
  }
}

type AuthSessionFixtures = {
  authSession: AuthSession | null;
};

export const test = base.extend<AuthSessionFixtures>({
  authSession: [null, { option: true }],
  storageState: async ({ authSession, baseURL, browser }, use) => {
    if (!authSession) {
      await use(undefined);
      return;
    }

    if (!baseURL) {
      throw new Error("Playwright baseURL is required to build authenticated storage state.");
    }

    const storageStatePath = toStorageStatePath(authSession.email);
    const isReusable = await hasReusableStorageState(browser, baseURL, storageStatePath);

    if (!isReusable) {
      await rm(storageStatePath, { force: true });
      await createStorageState(browser, baseURL, authSession, storageStatePath);
    }

    await use(storageStatePath);
  }
});

export { expect };
