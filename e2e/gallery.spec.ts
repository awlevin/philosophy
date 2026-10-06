import { expect, test } from "@playwright/test";
import { isTouch, snap } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
});

test("faces grouped by era", async ({ page }) => {
  await snap(page, "g1-faces-top");
  for (const era of ["Ancient", "Medieval", "Early Modern", "Modern", "Contemporary"]) {
    await expect(page.getByRole("region", { name: era, exact: true })).toBeAttached();
  }
});

test("view and order live in the filter panel, and the choice of view is remembered", async ({ page }) => {
  await page.getByRole("button", { name: "View and filter" }).click();
  await page.waitForTimeout(300);
  await snap(page, "g3-panel");
  await page.getByRole("radio", { name: "List" }).click();
  await page.getByRole("radio", { name: "A–Z" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page).toHaveURL(/sort=alpha/);
  await expect(page.getByRole("region", { name: "A", exact: true })).toBeAttached();
  // The old era sections fade out before the letters settle.
  await expect(page.locator('[data-slug="aristotle"]')).toHaveCount(1);
  await expect(page.locator('ol [data-slug="aristotle"]')).toBeVisible();
  await page.waitForTimeout(900);
  await snap(page, "g4-list-az");

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("ol [data-slug]").first()).toBeVisible();
  await page.waitForTimeout(400);
  await snap(page, "g5-list-time");
});

test("on touch, a tap peeks; swipe down or close dismisses it", async ({ page }) => {
  test.skip(!isTouch(), "peek is for touch screens");
  const card = page.locator('[data-slug="kant"] a');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  const peek = page.getByRole("dialog", { name: "Immanuel Kant, preview" });
  await expect(peek).toBeVisible();
  await expect(peek).toContainText("Act only on rules you could will everyone to follow.");
  await expect(page).toHaveURL(/\/$/);
  await page.waitForTimeout(400);
  await snap(page, "g6-peek");
  await peek.getByRole("button", { name: "Close preview" }).click();
  await expect(peek).toBeHidden();
});

test("Classic brings back the original look, everywhere, and opens pages directly", async ({ page }) => {
  await page.getByRole("button", { name: "View and filter" }).click();
  await page.getByRole("radio", { name: "Classic" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-look", "classic");
  await expect(page.getByRole("region", { name: "Ancient", exact: true })).toHaveCount(0);
  await page.waitForTimeout(500);
  await snap(page, "g7-classic");

  const plato = page.locator('[data-slug="plato"] a');
  await plato.scrollIntoViewIfNeeded();
  await plato.click();
  await expect(page).toHaveURL(/\/p\/plato$/);
  await page.waitForTimeout(1200);
  await snap(page, "g8-classic-detail");

  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-look", "classic");
});
