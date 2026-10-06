import { expect, test, type Page } from "@playwright/test";
import { isTouch, openFromGallery, snap } from "./helpers";

/** A one-finger vertical drag, sent as real touch events. */
async function drag(page: Page, from: number, to: number, { release = true, frames = "" } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const x = 195;
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", y?: number) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: y === undefined ? [] : [{ x, y }] });
  await touch("touchStart", from);
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await touch("touchMove", from + ((to - from) * i) / steps);
    await page.waitForTimeout(16);
  }
  if (frames) await snap(page, frames);
  if (release) await touch("touchEnd");
}

test.beforeEach(async ({ page }) => {
  test.skip(!isTouch(), "pull to dismiss is a touch gesture");
  await page.goto("/", { waitUntil: "networkidle" });
  await openFromGallery(page, "kant", "Immanuel Kant");
});

test("pulling down from the top shrinks the page, and letting go far enough closes it", async ({ page }) => {
  await drag(page, 250, 560, { frames: "pull-mid" });
  await page.waitForTimeout(120);
  await snap(page, "pull-released-120ms");
  await expect(page).toHaveURL(/\/$/);
  await page.waitForTimeout(800);
  await expect(page.locator('[data-slug="kant"]')).toBeInViewport();
});

test("a short pull springs back and keeps the page open", async ({ page }) => {
  await drag(page, 250, 300);
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/p\/kant$/);
  await expect(page.getByRole("heading", { name: "Immanuel Kant", level: 1 })).toBeInViewport();
});
