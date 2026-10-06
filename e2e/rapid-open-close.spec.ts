import { expect, test } from "@playwright/test";
import { openFromGallery, snap } from "./helpers";

// A closing card is lifted above the fading detail page until it lands. Reopening a detail page
// before it lands must drop that lift, or the card floats over the new page.
test("a card returning from a closed page never floats over the next one", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const mozi = page.locator('[data-slug="mozi"]');
  await openFromGallery(page, "mozi", "Mozi");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  await page.goForward();
  await expect(page).toHaveURL(/\/p\/mozi$/);
  await page.waitForTimeout(1600);

  await expect(mozi).not.toHaveCSS("z-index", "6");
});

// Closing one page and opening another before the first has finished leaving must still give the
// new page its full, opaque background (it reuses the leaving overlay).
test("opening another page while one is still closing shows it on a solid background", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await openFromGallery(page, "plato", "Plato");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  const laozi = page.locator('[data-slug="laozi"] a');
  await laozi.click();
  await expect(page).toHaveURL(/\/p\/laozi$/);
  await page.waitForTimeout(1500);
  await snap(page, "r1-reopen-while-closing");
  const backdrop = page.locator('[aria-modal="true"] .bg-paper').first();
  await expect(backdrop).toHaveCSS("opacity", "1");
});
