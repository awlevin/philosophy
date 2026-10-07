/**
 * Draws the portrait drop shadows as 9-slice images (src/assets/portrait-shadows/), then checks them
 * against the CSS box-shadow they stand in for.
 *
 * Why: Safari repaints a blurred box-shadow each time a gallery card moves, fades or scales, and with
 * 61 cards that costs it frames. Drawn from an image, the same shadow is close to free (see the
 * portrait shadow rules in src/index.css). Chrome renders the real box-shadow here, so the images match it.
 *
 *   npx tsx scripts/portrait-shadows.ts   (run after changing a theme's --shadow)
 */
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "src/assets/portrait-shadows");
const CSS = readFileSync(path.join(ROOT, "src/index.css"), "utf8");

/**
 * Each theme's --shadow, exactly as in src/index.css, the paper it sits on (for the check), and the
 * radii it's drawn at: Faces is light or dark, Classic is sepia or dark.
 */
const THEMES = {
  light: { shadow: "0 1px 2px rgb(20 18 24 / 0.06), 0 8px 24px -12px rgb(20 18 24 / 0.22)", paper: "#f7f5f0", radii: [10, 16] },
  dark: { shadow: "0 1px 2px rgb(0 0 0 / 0.3), 0 10px 30px -12px rgb(0 0 0 / 0.6)", paper: "#121215", radii: [3, 4, 10, 16] },
  sepia: { shadow: "0 1px 2px rgb(60 40 20 / 0.06), 0 8px 24px -12px rgb(60 40 20 / 0.25)", paper: "#f4efe6", radii: [3, 4] },
};
for (const [name, t] of Object.entries(THEMES)) {
  if (!CSS.includes(`--shadow: ${t.shadow};`)) throw new Error(`The ${name} shadow is no longer in src/index.css; update THEMES.`);
}

/**
 * Corner radii in use: grid cards (10; Classic 3) and detail pages (16; Classic 4). A card is drawn
 * from a phone-sized box, so a small card's corners come out right; a page from a larger one.
 */
const SHAPES: Record<number, { box: number; inner: number }> = {
  3: { box: 84, inner: 40 },
  10: { box: 84, inner: 40 },
  4: { box: 200, inner: 60 },
  16: { box: 200, inner: 60 },
};
/** How far the shadow reaches past the box (CSS px), the same for all, so one rule places them. */
const OUTSET = { top: 10, side: 20, bottom: 30 };
const SCALE = 3;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: SCALE, viewport: { width: 1000, height: 800 } });

/** Screenshot of a box's shadow alone (the box is clear, and box-shadow never paints under it). */
async function shadowOf(shadow: string, radius: number, w: number, h: number, paper?: string) {
  await page.setContent(`<body style="margin:0;background:${paper ?? "transparent"}">
    <div style="position:absolute;left:${OUTSET.side}px;top:${OUTSET.top}px;width:${w}px;height:${h}px;border-radius:${radius}px;box-shadow:${shadow}"></div>`);
  return page.screenshot({
    omitBackground: !paper,
    clip: { x: 0, y: 0, width: w + 2 * OUTSET.side, height: h + OUTSET.top + OUTSET.bottom },
  });
}

/** The same box drawn the way the site will: a pseudo-element with the image as its border-image. */
async function sliced(png: Buffer, inner: number, w: number, h: number, paper: string) {
  const s = (n: number) => n * SCALE;
  const [t, r, b, l] = [OUTSET.top + inner, OUTSET.side + inner, OUTSET.bottom + inner, OUTSET.side + inner];
  await page.setContent(`<body style="margin:0;background:${paper}">
    <div style="position:absolute;left:0;top:0;width:${w + 2 * OUTSET.side}px;height:${h + OUTSET.top + OUTSET.bottom}px;
      border-image:url(data:image/png;base64,${png.toString("base64")}) ${s(t)} ${s(r)} ${s(b)} ${s(l)} / ${t}px ${r}px ${b}px ${l}px"></div>`);
  return page.screenshot({ clip: { x: 0, y: 0, width: w + 2 * OUTSET.side, height: h + OUTSET.top + OUTSET.bottom } });
}

/** Largest per-channel difference between two screenshots of the same size (0–255). */
async function maxDiff(a: Buffer, b: Buffer) {
  const [x, y] = await Promise.all([a, b].map((i) => sharp(i).removeAlpha().raw().toBuffer()));
  let max = 0;
  for (let i = 0; i < x.length; i++) max = Math.max(max, Math.abs(x[i] - y[i]));
  return max;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let worst = 0;
for (const [name, t] of Object.entries(THEMES)) {
  for (const radius of t.radii) {
    const shape = SHAPES[radius];
    const shot = await shadowOf(t.shadow, radius, shape.box, shape.box);
    const png = await sharp(shot).png({ compressionLevel: 9, palette: true, quality: 100, effort: 10 }).toBuffer();
    writeFileSync(path.join(OUT, `${name}-${radius}.png`), png);
    // Check at the sizes each shape is shown at: phone cards up to desktop cards, phone pages up to desktop pages.
    const sizes = shape.box < 100 ? [80, 84, 120, 170, 200] : [300, 358, 460];
    const diffs = [];
    for (const w of sizes) {
      const d = await maxDiff(await shadowOf(t.shadow, radius, w, w, t.paper), await sliced(png, shape.inner, w, w, t.paper));
      diffs.push(`${w}px Δ${d}`);
      worst = Math.max(worst, d);
    }
    console.log(`${name}-${radius}.png  ${(png.length / 1024).toFixed(1)} KB  ${diffs.join("  ")}`);
  }
}
await browser.close();
// Out of 255 per channel: a few levels is invisible; more means the slices no longer fit the shadow.
if (worst > 4) throw new Error(`A 9-slice shadow differs from its box-shadow by ${worst}/255.`);
console.log(`Largest difference from the CSS shadow: ${worst}/255.`);
