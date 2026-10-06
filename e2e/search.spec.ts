import { expect, test } from "@playwright/test";
import { isTouch, openFromGallery, snap } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
});

test("search waits for a pause in typing, then filters; the clear button empties it", async ({ page }) => {
  const box = page.getByRole("searchbox", { name: "Search by name" });
  await box.pressSequentially("kant", { delay: 40 });
  // Mid-typing the URL hasn't caught up yet; after a pause it has.
  await expect(page).not.toHaveURL(/q=kant/);
  await expect(page).toHaveURL(/q=kant/);
  await expect(page.locator("[data-slug]")).toHaveCount(1);
  await snap(page, "s1-search-typed");

  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(box).toHaveValue("");
  await expect(box).toBeFocused();
  await expect(page).not.toHaveURL(/q=/);
  await expect(page.getByRole("button", { name: "Clear search" })).toBeHidden();
});

test("search matches where they were born, then and now", async ({ page }) => {
  const box = page.getByRole("searchbox", { name: "Search by name" });
  await box.fill("prussia");
  await expect(page.locator('[data-slug="kant"]')).toBeVisible();
  await expect(page.locator('[data-slug="descartes"]')).toHaveCount(0);
  await box.fill("russia");
  await expect(page.locator('[data-slug="kant"]')).toBeVisible();
});

test("a page says where they were born", async ({ page }) => {
  await openFromGallery(page, "descartes", "René Descartes");
  await expect(page.getByText("Born in La Haye en Touraine, France")).toBeVisible();
  await snap(page, "s2-born-in");
});

test("on touch, the peek shows where they're from", async ({ page }) => {
  test.skip(!isTouch(), "peek is for touch screens");
  await page.goto("/?question=know", { waitUntil: "networkidle" });
  await page.locator('[data-slug="kant"] a').click();
  await expect(page.getByRole("dialog", { name: "Immanuel Kant, preview" })).toContainText("1724–1804 · Prussia");
});
