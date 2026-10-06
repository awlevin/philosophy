/**
 * Renders the link-preview images (1200×630 JPEGs) into public/og/: home.jpg, quiz.jpg and one
 * placard per philosopher in p/. Run `npm run og` after changing a philosopher or the designs,
 * and commit the output. Needs Playwright's Chromium (`npx playwright install chromium`).
 */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { philosophers, type Era, type Philosopher } from "../src/data/philosophers";
import { homeland, lifespan } from "../src/lib/format";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "og");
const b64 = async (...f: string[]) => (await readFile(path.join(ROOT, ...f))).toString("base64");

// Era grounds and inks, read from the app's own tokens (first block = light, second = dark).
const css = await readFile(path.join(ROOT, "src/index.css"), "utf8");
const KEY: Record<Era, string> = { Ancient: "ancient", Medieval: "medieval", "Early Modern": "early-modern", Modern: "modern", Contemporary: "contemporary" };
const token = (era: Era, part: "tint" | "ink", n: 0 | 1) =>
  [...css.matchAll(new RegExp(`--era-${KEY[era]}-${part}:\\s*(#[0-9a-f]{6})`, "g"))][n][1];

const fonts = {
  display: await b64("node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2"),
  sans: await b64("node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2"),
};
const portrait = new Map<string, string>();
for (const p of philosophers) portrait.set(p.slug, await b64("public/portraits", `${p.slug}-480.jpg`));
const bySlug = new Map(philosophers.map((p) => [p.slug, p]));
const face = (slug: string) => `data:image/jpeg;base64,${portrait.get(slug)}`;
const tint = (slug: string) => token(bySlug.get(slug)!.era, "tint", 0);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const shell = (body: string, bg: string, fg: string) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:D;font-weight:600;src:url(data:font/woff2;base64,${fonts.display})}
@font-face{font-family:S;font-weight:100 900;src:url(data:font/woff2;base64,${fonts.sans})}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;position:relative;background:${bg};color:${fg};font-family:S,sans-serif}
.d{font-family:D,serif;font-weight:600}
.kick{font-size:20px;letter-spacing:.16em;text-transform:uppercase;font-weight:600}
.abs{position:absolute}
.ph{display:block;background-size:cover;background-position:center 18%}
</style>${body}`;

// The mark from public/favicon.svg.
const mark = (px: number) =>
  `<svg width="${px}" height="${px}" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#1c1a17"/><circle cx="32" cy="32" r="25" fill="none" stroke="#c79a62" stroke-width="1.5"/><text x="32" y="43" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="#ece6dc">Φ</text></svg>`;

function home() {
  const wall = "socrates confucius descartes kant plato laozi spinoza marx aristotle avicenna hume arendt".split(" ");
  const tiles = wall.map((s) => `<i class="ph" style="background-color:${tint(s)};background-image:url(${face(s)})"></i>`).join("");
  return shell(
    `<div class="abs" style="left:0;top:0;bottom:0;width:620px;padding:64px;display:flex;flex-direction:column;justify-content:space-between">
    <div>${mark(64)}</div>
    <div><div class="kick" style="color:#5d5a63">Quick reference</div>
    <div class="d" style="font-size:100px;line-height:.95;margin-top:14px;white-space:nowrap">Philosophers</div>
    <div style="font-size:30px;line-height:1.35;color:#46434c;margin-top:22px;max-width:470px">Sixty-one philosophers with skimmable facts about each of them.</div></div>
  </div>
  <div class="abs" style="right:0;top:0;bottom:0;width:580px;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,1fr);gap:5px;background:#f7f5f0">${tiles}</div>`,
    "#f7f5f0",
    "#17161b",
  );
}

function quiz() {
  const dots = [[220, 76, "#2847a3"], [340, 58, "#8f9fd1"], [440, 44, "#d9d5cc"], [540, 58, "#d49a8a"], [660, 76, "#a3361e"]]
    .map(([x, s, c]) => `<div class="abs" style="left:${+x - +s / 2}px;top:${430 - +s / 2}px;width:${s}px;height:${s}px;border-radius:50%;background:${c}"></div>`)
    .join("");
  const av = ["hume", "arendt", "spinoza", "nietzsche"]
    .map((s) => `<i class="ph" style="width:64px;height:64px;border-radius:50%;margin-left:-18px;box-shadow:0 0 0 4px #f7f5f0;background-color:${tint(s)};background-image:url(${face(s)})"></i>`)
    .join("");
  return shell(
    `<div class="abs" style="left:100px;top:70px;right:100px"><div class="kick" style="color:#a3361e">Quiz · 14 statements</div>
    <div class="d" style="font-size:96px;line-height:1.02;margin-top:20px">You can’t be truly certain of anything.</div></div>
  ${dots}
  <div class="abs" style="left:100px;top:496px;width:240px;font-size:22px;color:#5d5a63;text-align:center">Disagree</div>
  <div class="abs" style="left:540px;top:496px;width:240px;font-size:22px;color:#5d5a63;text-align:center">Agree</div>
  <div class="abs" style="right:100px;top:396px;display:flex;flex-direction:column;align-items:flex-end;gap:20px">
    <div style="display:flex;padding-left:18px">${av}</div>
    <div class="d" style="font-size:40px;text-align:right;line-height:1.05">Who thinks<br>like you?</div></div>`,
    "#f7f5f0",
    "#17161b",
  );
}

/** Their best line: the first fact that is a quotation, else the first fact. */
const line = (p: Philosopher) => p.facts.find((f) => /^“.*”$/.test(f)) ?? p.facts[0];

function placard(p: Philosopher) {
  const q = line(p);
  const size = q.length <= 48 ? 84 : q.length <= 70 ? 70 : 58;
  return shell(
    `<div class="abs ph" style="left:0;top:0;bottom:0;width:400px;background-color:${token(p.era, "tint", 1)};background-image:url(${face(p.slug)});background-position:center 15%"></div>
  <div class="abs" style="left:470px;right:64px;top:64px;bottom:56px;display:flex;flex-direction:column;justify-content:space-between">
    <div><div class="kick" style="color:${token(p.era, "ink", 1)}">${esc(p.era)} · ${esc(homeland(p))} · ${esc(lifespan(p))}</div>
    <div class="d" style="font-size:${size}px;line-height:1.04;margin-top:26px">${esc(q)}</div></div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:24px">
      <div class="d" style="font-size:${p.name.length > 18 ? 38 : 46}px;line-height:1.05">${esc(p.name)}</div>
      <div style="font-size:20px;color:#9c98a3;letter-spacing:.04em;white-space:nowrap">Philosophers Quick Reference</div></div>
  </div>`,
    "#121215",
    "#f1efe9",
  );
}

await mkdir(path.join(OUT, "p"), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const shoot = async (html: string, file: string) => {
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate("document.fonts.ready");
  await page.screenshot({ path: path.join(OUT, file), type: "jpeg", quality: 86 });
};
await shoot(home(), "home.jpg");
await shoot(quiz(), "quiz.jpg");
for (const p of philosophers) await shoot(placard(p), `p/${p.slug}.jpg`);
await browser.close();
console.log(`Wrote ${philosophers.length + 2} images to public/og/.`);
