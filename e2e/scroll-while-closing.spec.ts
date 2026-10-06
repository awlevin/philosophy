import { expect, test } from "@playwright/test";
import { openFromGallery } from "./helpers";

// Closing a page plays a short morph back into the gallery. The gallery should scroll right away,
// not only once the morph has finished.
test("the gallery scrolls while a page is still closing", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await openFromGallery(page, "kant", "Immanuel Kant");
  await page.getByRole("button", { name: "All philosophers" }).click();
  await page.waitForTimeout(80);
  const before = (await page.evaluate("window.scrollY")) as number;
  await page.mouse.move(200, 400);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(150);
  const after = (await page.evaluate("window.scrollY")) as number;
  expect(after - before).toBeGreaterThan(200);
});
