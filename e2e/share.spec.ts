import { expect, test } from "@playwright/test";
import { snap } from "./helpers";

test("a philosopher's page can be shared; without a share sheet it copies the link", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => Object.defineProperty(navigator, "share", { value: undefined }));
  await page.goto("/p/plato", { waitUntil: "networkidle" });
  await expect(page).toHaveTitle("Plato (c. 428–348 BCE) — Philosophers");

  const share = page.getByRole("button", { name: "Share this page" });
  await expect(share).toBeInViewport();
  await snap(page, "share-1-idle");
  await share.click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  await snap(page, "share-2-copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/p\/plato$/);
});
