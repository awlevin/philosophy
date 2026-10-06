import { expect, test } from "@playwright/test";
import { chooseOrder, chooseView, isTouch, snap } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
});

test("faces grouped by era", async ({ page }) => {
  await snap(page, "g1-faces-top");
  for (const era of ["Ancient", "Medieval", "Early Modern", "Modern", "Contemporary"]) {
    await expect(page.getByRole("region", { name: era, exact: true })).toBeAttached();
  }
});

test("view and order are one tap away, and the choice of view is remembered", async ({ page }) => {
  await chooseView(page, "List");
  await chooseOrder(page, "A–Z");
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

test("a menu per facet: pick a tradition, see the count, keep the chip", async ({ page }) => {
  await page.getByRole("button", { name: "Tradition", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "Tradition" });
  await expect(menu).toBeVisible();
  await menu.getByRole("searchbox", { name: "Find a tradition" }).fill("gre");
  await menu.getByRole("checkbox", { name: /Greek/ }).click();
  await page.waitForTimeout(300);
  await snap(page, "g3-facet-menu");
  await menu.getByRole("button", { name: /^Show 8/ }).click();
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/tradition=greek/);
  await expect(page.getByRole("button", { name: "Remove filter: Tradition Greek" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tradition: Greek" })).toBeVisible();
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
  await chooseView(page, "Classic");
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

test("on touch, a second tap on a peeking face opens its page", async ({ page }) => {
  test.skip(!isTouch(), "peek is for touch screens");
  const card = page.locator('[data-slug="kant"] a');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page.getByRole("dialog", { name: "Immanuel Kant, preview" })).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/p\/kant$/);
});

test("on touch, opening a filter menu puts the peek sheet away", async ({ page }) => {
  test.skip(!isTouch(), "peek is for touch screens");
  await page.locator('[data-slug="plato"] a').click();
  const peek = page.getByRole("dialog", { name: "Plato, preview" });
  await expect(peek).toBeVisible();
  await page.getByRole("button", { name: "Era", exact: true }).click();
  await expect(peek).toBeHidden();
  await expect(page.getByRole("dialog", { name: "Era" })).toBeVisible();
});

test("on touch, peeking can be turned off so a tap opens the page", async ({ page }) => {
  test.skip(!isTouch(), "peek is for touch screens");
  await page.getByRole("button", { name: /^Show as:/ }).click();
  await page.waitForTimeout(300);
  await snap(page, "g9-tap-setting");
  await page.getByRole("radio", { name: /Open the page/ }).click();
  await page.getByRole("button", { name: "Done" }).click();
  const card = page.locator('[data-slug="kant"] a');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page).toHaveURL(/\/p\/kant$/);
});

test("on touch, opening from the peek grows the page out of the sheet", async ({ page }) => {
  test.skip(!isTouch(), "peek is for touch screens");
  const card = page.locator('[data-slug="kant"] a');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  const peek = page.getByRole("dialog", { name: "Immanuel Kant, preview" });
  await expect(peek).toBeVisible();
  await page.waitForTimeout(500);
  await peek.getByRole("button", { name: "Open Kant" }).click();
  let elapsed = 0;
  for (const ms of [40, 120, 220, 350, 550, 900]) {
    await page.waitForTimeout(ms - elapsed);
    elapsed = ms;
    await snap(page, `p-open-${String(ms).padStart(4, "0")}ms`);
  }
  await expect(page).toHaveURL(/\/p\/kant$/);
  await expect(page.getByRole("heading", { name: "Immanuel Kant", level: 1 })).toBeInViewport();
});
