import { test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

/**
 * Records "Peek → page" one frame (1/60 s) at a time on a stopped clock, as layers the lab composites
 * live: the scene without either text, the page's contents alone, and the peek's text alone, plus
 * how far the page has slid on each frame. Framer is kept off the Web
 * Animations API so all of its motion runs on the clock we step.
 */
const FRAME = 1000 / 60;
const FRAMES = 36;
const OUT = "lab-out/layers";

const ONLY = (sel: string) => `
  html, body { background: transparent !important; }
  body * { visibility: hidden !important; }
  ${sel}, ${sel} * { visibility: visible !important; }
  ${sel} { opacity: 1 !important; }
  :root:root[data-page-growing] #grid .portrait { visibility: hidden !important; }`;
const LAYERS = {
  base: "[data-page-content], [data-peek-content] { opacity: 0 !important; }",
  page: ONLY("[data-page-content]"),
  peek: ONLY("[data-peek-content]"),
};

async function shoot(page: Page, layer: keyof typeof LAYERS, path: string) {
  await page.evaluate((css) => {
    let s = document.getElementById("lab-layer");
    if (!s) document.head.append((s = Object.assign(document.createElement("style"), { id: "lab-layer" })));
    s.textContent = css;
  }, LAYERS[layer]);
  await page.screenshot({ path, scale: "css", omitBackground: layer !== "base" });
}

test("peek-open", async ({ page }) => {
  const layers = ["base", "page", "peek"] as const;
  for (const l of layers) mkdirSync(`${OUT}/${l}`, { recursive: true });
  await page.addInitScript(() => {
    localStorage.setItem("tap", "peek");
    delete (Element.prototype as { animate?: unknown }).animate;
  });
  await page.clock.install();
  await page.goto("/?question=ruled", { waitUntil: "networkidle" });
  // Stop the clock; from here on time only moves when we step it.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1500);
  const step = async (ms: number) => {
    for (let t = 0; t < ms; t += FRAME) await page.clock.runFor(FRAME);
  };

  const card = page.locator('[data-slug="hobbes"] a');
  await card.scrollIntoViewIfNeeded();
  await card.click({ noWaitAfter: true });
  await step(900);
  const top = await page.evaluate(() => document.querySelector('[aria-label$=", preview"]')!.getBoundingClientRect().top);
  await page.getByRole("button", { name: "Open Hobbes" }).click({ noWaitAfter: true });

  const slid: number[] = [];
  for (let n = 0; n < FRAMES; n++) {
    const name = String(n).padStart(3, "0");
    for (const l of layers) await shoot(page, l, `${OUT}/${l}/${name}.png`);
    slid.push(
      await page.evaluate((top) => {
        const d = document.querySelector<HTMLElement>('[aria-modal="true"]');
        if (!d) return 0;
        const y = d.getBoundingClientRect().top;
        return Math.round(Math.min(1, Math.max(0, 1 - y / top)) * 1000) / 1000;
      }, top),
    );
    await page.clock.runFor(FRAME);
  }
  writeFileSync(`${OUT}/slid.json`, JSON.stringify(slid));
});
