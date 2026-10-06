import { expect, test, type Page } from "@playwright/test";

/** Snapshots for eyeballing, kept with the test output per project. */
export const snap = (page: Page, name: string) =>
  page.screenshot({ path: `test-results/shots/${test.info().project.name}/${name}.png` });

export const isTouch = () => !!test.info().project.use.hasTouch;

/** Opens a philosopher's page from the gallery as a person would: on touch, via the peek sheet. */
export async function openFromGallery(page: Page, slug: string, name: string) {
  const card = page.locator(`[data-slug="${slug}"] a`);
  await card.scrollIntoViewIfNeeded();
  await card.click();
  if (isTouch()) {
    const peek = page.getByRole("dialog", { name: `${name}, preview` });
    await expect(peek).toBeVisible();
    await page.waitForTimeout(350);
    await peek.getByRole("button", { name: /^Open / }).click();
  }
  await expect(page).toHaveURL(new RegExp(`/p/${slug}$`));
  await page.waitForTimeout(1200);
}
