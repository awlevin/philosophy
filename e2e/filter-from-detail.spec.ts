import { expect, test, type Page } from "@playwright/test";

/** Snapshots of the flow for eyeballing, kept with the test output. */
const snap = (page: Page, name: string) => page.screenshot({ path: `test-results/shots/${test.info().project.name}/${name}.png` });

async function openPlatoFromGrid(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });
  const card = page.locator('a[href="/p/plato"]');
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page).toHaveURL(/\/p\/plato$/);
  await page.waitForTimeout(1200);
}

test("tapping a detail chip lands on a gallery that clearly says it is filtered", async ({ page }) => {
  await openPlatoFromGrid(page);
  await snap(page, "1-detail");

  const greek = page.getByRole("link", { name: "Greek: show all 8" });
  await greek.scrollIntoViewIfNeeded();
  await snap(page, "2-detail-chips");
  await greek.click();

  let elapsed = 0;
  for (const ms of [80, 200, 350, 550, 900, 1500]) {
    await page.waitForTimeout(ms - elapsed);
    elapsed = ms;
    await snap(page, `3-landing-${String(ms).padStart(4, "0")}ms`);
  }

  await expect(page).toHaveURL(/\/\?tradition=greek$/);
  const chip = page.getByRole("button", { name: "Remove filter: Tradition Greek" });
  await expect(chip).toBeInViewport();
  await expect(page.getByText("of 61", { exact: false }).first()).toBeInViewport();
  await expect(page.locator('[data-slug="plato"]')).toBeInViewport();
  const back = page.getByRole("button", { name: "Back to Plato" });
  await expect(back).toBeInViewport();

  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: /53 others hidden/ })).toBeInViewport();
  await page.waitForTimeout(400);
  await snap(page, "4-bottom");

  await back.click();
  await expect(page).toHaveURL(/\/p\/plato$/);
  await page.waitForTimeout(1200);
  await snap(page, "5-back-to-plato");
});

test("removing the pinned chip shows everyone and drops the way back", async ({ page }) => {
  await openPlatoFromGrid(page);
  await page.getByRole("link", { name: "Greek: show all 8" }).click();
  await page.waitForTimeout(1500);

  await page.getByRole("button", { name: "Remove filter: Tradition Greek" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("[data-slug]")).toHaveCount(61);
  await expect(page.getByRole("button", { name: "Back to Plato" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /others hidden/ })).toHaveCount(0);
});
