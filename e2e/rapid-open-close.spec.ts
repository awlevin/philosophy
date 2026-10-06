import { expect, test } from "@playwright/test";

// A closing card is lifted above the fading detail page until it lands. Reopening a detail page
// before it lands must drop that lift, or the card floats over the new page.
test("a card returning from a closed page never floats over the next one", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const mozi = page.locator('[data-slug="mozi"]');
  await mozi.scrollIntoViewIfNeeded();
  await mozi.locator("a").click();
  await expect(page).toHaveURL(/\/p\/mozi$/);
  await page.waitForTimeout(1000);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  await page.goForward();
  await expect(page).toHaveURL(/\/p\/mozi$/);
  await page.waitForTimeout(1600);

  await expect(mozi).not.toHaveCSS("z-index", "60");
});
