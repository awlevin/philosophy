import { expect, test, type Page } from "@playwright/test";

/** Snapshots for eyeballing, kept with the test output per project. */
export const snap = (page: Page, name: string) =>
  page.screenshot({ path: `test-results/shots/${test.info().project.name}/${name}.png` });

export const isTouch = () => !!test.info().project.use.hasTouch;

/** Opens a philosopher's page from the gallery as a person would (through the peek sheet when it shows). */
export async function openFromGallery(page: Page, slug: string, name: string) {
  const card = page.locator(`[data-slug="${slug}"] a`);
  await card.scrollIntoViewIfNeeded();
  await card.click();
  // Touch screens peek first.
  if (isTouch()) {
    const peek = page.getByRole("dialog", { name: `${name}, preview` });
    await expect(peek).toBeVisible();
    await page.waitForTimeout(350);
    await peek.getByRole("button", { name: /^Open / }).click();
  }
  await expect(page).toHaveURL(new RegExp(`/p/${slug}$`));
  await page.waitForTimeout(1200);
}

/** Picks a view: icon toggle on larger screens, the "Show as" menu on phones. */
export async function chooseView(page: Page, label: "Faces" | "List" | "Classic") {
  if (isTouch()) await page.getByRole("button", { name: /^Show as:/ }).click();
  await page.getByRole("radio", { name: label }).click();
}

/** Picks an order from its menu. */
export async function chooseOrder(page: Page, label: "By time" | "A–Z") {
  await page.getByRole("button", { name: /^(By time|A–Z)$/ }).click();
  await page.getByRole("radio", { name: label }).click();
}
