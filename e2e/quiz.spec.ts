import { expect, test, type Page } from "@playwright/test";
import { STATEMENTS } from "../src/data/quiz";
import { snap } from "./helpers";

const LABELS = ["Strongly disagree", "Disagree a little", "Not sure", "Agree a little", "Strongly agree"];
/** A skeptical empiricist who wants less: closest to Russell, furthest from Leibniz. */
const ANSWERS = [-1, 1, 2, -2, 2, 0, -1, -1, 1, 1, 2, 1, 1, 1];

async function takeQuiz(page: Page, shots = false) {
  await page.getByRole("button", { name: "Begin" }).click();
  for (let k = 0; k < STATEMENTS.length; k++) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(STATEMENTS[k].text);
    if (shots && k === 4) {
      await page.waitForTimeout(450);
      await snap(page, "q3-statement");
    }
    await page.getByRole("button", { name: LABELS[ANSWERS[k] + 2], exact: true }).click();
    const reveal = page.getByRole("region", { name: "Who agrees" });
    await expect(reveal).toBeVisible();
    if (k === 4) {
      await expect(reveal).toContainText("Siddhartha Gautama");
      await expect(reveal).toContainText("With you · 12");
      await expect(reveal).toContainText("Against you · 2");
      if (shots) {
        await page.waitForTimeout(700);
        await snap(page, "q4-answered");
      }
    }
    await page.getByRole("button", { name: k === STATEMENTS.length - 1 ? "See your results" : "Next statement" }).click();
  }
  await expect(page.getByRole("heading", { name: "Your philosophers" })).toBeVisible();
}

test("the home page offers the quiz in one quiet line", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const callout = page.getByRole("link", { name: /Which of them think like you\?/ });
  await expect(callout).toContainText("Takes ~ 3 minutes");
  await snap(page, "q1-home-callout");
});

test("take the quiz, open a match, come back, and see everyone ranked for you", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /Which of them think like you\?/ }).click();
  await expect(page).toHaveURL(/\/quiz$/);
  await expect(page.getByRole("heading", { name: "Who thinks like you?" })).toBeVisible();
  await page.waitForTimeout(500);
  await snap(page, "q2-intro");

  await takeQuiz(page, true);
  const closest = page.getByRole("region", { name: "Closest to you" });
  await expect(closest.getByRole("link").first()).toContainText("Bertrand Russell");
  await expect(closest.getByRole("link").first()).toContainText("86%");
  const furthest = page.getByRole("region", { name: "Five to argue with" });
  await expect(furthest.getByRole("link").first()).toContainText("Leibniz");
  await page.waitForTimeout(600);
  await snap(page, "q5-results");
  await furthest.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await snap(page, "q6-results-furthest");

  // A result opens its page, which shows where you stand, and closing it returns to the results.
  await closest.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/p\/russell$/);
  await expect(page.getByRole("region", { name: "You and Russell" })).toContainText("86%");
  await page.waitForTimeout(900);
  await snap(page, "q7-detail-you-and");
  await page.getByRole("button", { name: "All philosophers" }).click();
  await expect(page).toHaveURL(/\/quiz$/);
  await expect(page.getByRole("heading", { name: "Your philosophers" })).toBeVisible();

  await page.getByRole("link", { name: /ranked for you/ }).click();
  await expect(page).toHaveURL(/\?sort=match$/);
  await expect(page.locator("#grid [data-slug]").first()).toHaveAttribute("data-slug", "russell");
  await expect(page.getByRole("region", { name: "Furthest from you", exact: true })).toBeAttached();
  await expect(page.getByRole("link", { name: /Closest to you: Russell, Marx and Arendt/ })).toBeVisible();
  await page.waitForTimeout(700);
  await snap(page, "q8-ranked-for-you");
});

test("results are remembered on this device until cleared", async ({ page }) => {
  await page.goto("/quiz", { waitUntil: "networkidle" });
  await takeQuiz(page);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Your philosophers" })).toBeVisible();
  await page.getByRole("button", { name: "Clear my answers" }).click();
  await expect(page.getByRole("heading", { name: "Who thinks like you?" })).toBeVisible();
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("link", { name: /Which of them think like you\?/ })).toBeVisible();
});
