import type { Browser, BrowserContext } from "@playwright/test";

export async function createContext(
  browser: Browser,
  storageStatePath?: string,
): Promise<BrowserContext> {
  return browser.newContext(
    storageStatePath
      ? {
          storageState: storageStatePath,
        }
      : undefined,
  );
}
