import { expect, test, type Page } from "@playwright/test";
import { STATEMENTS } from "../src/data/quiz";
import { isTouch, snap } from "./helpers";

/** What an iPhone shows of a page in Safari with both toolbars up: 390 × ~658. */
test.use({ viewport: { width: 390, height: 658 } });

/** How far the quiz overflows its screen, in px (0 = it all fits). */
const overflow = (page: Page) =>
  page.locator("[data-quiz-scroller]").evaluate((el) => el.scrollHeight - el.clientHeight);

test("on a small phone, every quiz screen fits without scrolling", async ({ page }) => {
  test.skip(!isTouch(), "phone layout");
  test.setTimeout(90_000);
  await page.goto("/quiz", { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Begin" })).toBeVisible();
  await page.waitForTimeout(600);
  await snap(page, "f1-intro-small");
  expect(await overflow(page), "intro").toBe(0);

  await page.getByRole("button", { name: "Begin" }).click();
  for (let k = 0; k < STATEMENTS.length; k++) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(STATEMENTS[k].text);
    await page.waitForTimeout(450);
    expect(await overflow(page), `statement ${k + 1}`).toBe(0);
    // Strongly disagree: for most statements the longer camp is then "Against you".
    await page.getByRole("button", { name: "Strongly disagree", exact: true }).click();
    await expect(page.getByRole("region", { name: "Who agrees" })).toBeVisible();
    await page.waitForTimeout(500);
    if (k === 8) await snap(page, "f2-answered-small");
    expect(await overflow(page), `statement ${k + 1}, answered`).toBe(0);
    await page.getByRole("button", { name: k === STATEMENTS.length - 1 ? "See your results" : "Next statement" }).click();
  }
});
