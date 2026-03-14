import type { Page } from "@playwright/test";

export async function ensurePageLoaded(page: Page) {
  if (page.url() === "about:blank") {
    await page.goto("/");
  }
}
