/// <reference lib="dom" />
/**
 * Records the demo video: a scripted walk through the site on a phone-sized screen.
 *
 *   npm run demo                      # records the live site -> demo-out/demo.mp4
 *   BASE_URL=http://127.0.0.1:5173 npm run demo
 *
 * Frames are full-resolution screenshots (3x, no VP8 blur). Tap rings and the end card are
 * drawn into the page itself. Captions are rendered to PNGs and laid over a band above the screen. ffmpeg stitches the frames by
 * their real timestamps; stretches marked `fast` play at 3x.
 */
import { chromium, type CDPSession, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { QUESTIONS } from "../src/data/types";
import { STATEMENTS } from "../src/data/quiz";

const BASE = process.env.BASE_URL ?? "https://philosophy-virid.vercel.app";
const OUT = "demo-out";
const FRAMES = `${OUT}/frames`;
const W = 390;
const H = 844;
const SCALE = 3; // 1170 x 2532
const FAST = 3;
const BAND = 56 * SCALE; // caption band above the screen, in output pixels

const LABELS = ["Strongly disagree", "Disagree a little", "Not sure", "Agree a little", "Strongly agree"];
/** A skeptical empiricist who wants less: closest to Russell, furthest from Leibniz. */
const ANSWERS = [-1, 1, 2, -2, 2, 0, -1, -1, 1, 1, 2, 1, 1, 1];

/** Drawn inside the page: a ring where a finger lands, and the end card. */
const OVERLAY = `
window.__name = (f) => f; // tsx wraps named functions in page callbacks with this
(() => {
  const css = document.createElement("style");
  css.textContent = \`
    .demo-ring{position:fixed;z-index:2147483646;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;
      background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.9);box-shadow:0 0 0 1px rgba(0,0,0,.25);
      animation:demo-ring .55s ease-out forwards}
    @keyframes demo-ring{from{transform:scale(.6);opacity:1}to{transform:scale(1.5);opacity:0}}
    #demo-end{position:fixed;inset:0;z-index:2147483645;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
      background:rgba(14,12,10,.94);color:#f6f1e7;text-align:center;opacity:0;pointer-events:none;transition:opacity .8s ease}
    #demo-end.on{opacity:1}
    #demo-end b{font:500 44px/1.05 "Cormorant Garamond",Georgia,serif}
    #demo-end span{font:500 15px/1.3 "Instrument Sans Variable",system-ui,sans-serif;opacity:.75;letter-spacing:.02em}
  \`;
  const mount = () => {
    document.head.append(css);
    const end = document.createElement("div");
    end.id = "demo-end";
    end.innerHTML = "<b>Sixty-one<br>philosophers.</b><span>Thales to Foucault, in one pocket.</span><span>philosophy-virid.vercel.app</span>";
    document.body.append(end);
  };
  if (document.body) mount(); else addEventListener("DOMContentLoaded", mount);
  addEventListener("pointerdown", (e) => {
    const r = document.createElement("div");
    r.className = "demo-ring";
    r.style.left = e.clientX + "px";
    r.style.top = e.clientY + "px";
    document.body.append(r);
    setTimeout(() => r.remove(), 600);
  }, true);
  window.__end = () => document.getElementById("demo-end")?.classList.add("on");
})();
`;

type Frame = { file: string; ts: number };
type Caption = { text: string; t0: number; t1?: number };

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(FRAMES, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
    reducedMotion: "no-preference",
  });
  await context.addInitScript(OVERLAY);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  const clock = () => Date.now() / 1000;

  // Frames: Chrome's screencast stops at CSS pixels (390 wide), so three workers take full-resolution
  // screenshots back to back, each stamped with the middle of its capture. The clip is in document
  // coordinates, so a poller keeps the latest scroll position for them to follow.
  const frames: Frame[] = [];
  const fastRanges: Array<[number, number]> = [];
  let recording = false;
  let workers: Promise<void>[] = [];
  let view = { x: 0, y: 0 };
  let n = 0;
  const poll = async () => {
    while (recording) {
      const { cssVisualViewport: vv } = await cdp.send("Page.getLayoutMetrics");
      view = { x: vv.pageX, y: vv.pageY };
      await new Promise((r) => setTimeout(r, 4));
    }
  };
  const worker = async () => {
    while (recording) {
      const t0 = clock();
      const at = view;
      const shot = await cdp.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 88,
        optimizeForSpeed: true,
        clip: { x: at.x, y: at.y, width: W, height: H, scale: SCALE },
      });
      const ts = (t0 + clock()) / 2;
      const file = `${FRAMES}/${String(n++).padStart(6, "0")}.jpg`;
      await writeFile(file, Buffer.from(shot.data, "base64"));
      frames.push({ file, ts });
    }
  };
  const startCapture = () => {
    recording = true;
    workers = [poll(), worker(), worker(), worker()];
  };
  const stopCapture = async () => {
    recording = false;
    await Promise.all(workers);
    frames.sort((a, b) => a.ts - b.ts);
  };

  const captions: Caption[] = [];
  const caption = async (text: string) => {
    const now = clock();
    const last = captions.at(-1);
    if (last && last.t1 === undefined) last.t1 = now;
    if (text) captions.push({ text, t0: now });
  };
  const beat = (ms: number) => page.waitForTimeout(ms);
  const fast = async (run: () => Promise<void>) => {
    const t0 = clock();
    await run();
    fastRanges.push([t0, clock()]);
  };

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await beat(600);
  startCapture();

  // 1 · the wall of faces
  await beat(900);
  await caption("Meet sixty-one great thinkers.");
  await glide(page, 600, 2200);
  await glide(page, 900, 2400);
  await beat(500);
  await glideTo(page, 0, 1400);

  // 2 · scan by era
  await caption("Start anywhere in time.");
  await openMenu(page, "Era");
  await page.getByRole("dialog", { name: "Era" }).getByRole("checkbox", { name: /Ancient/ }).tap();
  await beat(600);
  await page.getByRole("dialog", { name: "Era" }).getByRole("button", { name: /^Show / }).tap();
  await beat(1200);
  await clearFilters(page);
  await beat(500);

  // 3 · ask a big question, get their answer
  await caption("Bring them a big question.");
  await openMenu(page, "Big question");
  await page.getByRole("dialog", { name: "Big question" }).getByRole("checkbox", { name: new RegExp(QUESTIONS[2].replace("?", "\\?")) }).tap();
  await beat(600);
  await page.getByRole("dialog", { name: "Big question" }).getByRole("button", { name: /^Show / }).tap();
  await beat(1200);
  await caption("Hear what each would say.");
  await tapFace(page, "socrates");
  await beat(1900);
  await page.getByRole("dialog", { name: /preview$/ }).getByRole("button", { name: /^Close preview/ }).tap();
  await beat(500);
  await tapFace(page, "kant");
  await beat(1900);

  // 4 · into the page
  await caption("Then sit with one.");
  await page.getByRole("dialog", { name: /preview$/ }).getByRole("button", { name: /^Open / }).tap();
  await page.waitForURL(/\/p\/kant$/);
  await beat(1500);
  await glide(page, 800, 1800);
  await glide(page, 800, 1800);
  await beat(400);
  await glideTo(page, 0, 900);

  // 5 · swipe through history, then pull the page closed
  await caption("Wander through history.");
  await beat(500);
  await swipe(page, "left");
  await beat(1300);
  await swipe(page, "left");
  await beat(1300);
  await caption("Pull down to leave.");
  await pull(page, 250, 580);
  await page.waitForURL(/\/\?question=/);
  await beat(1500);

  // 6 · search and views
  await caption("Find anyone. See it your way.");
  await clearFilters(page);
  await beat(500);
  await page.getByRole("searchbox").first().tap();
  await page.keyboard.type("plat", { delay: 220 });
  await beat(1400);
  await page.getByRole("button", { name: "Clear search" }).tap();
  await beat(700);
  await page.getByRole("button", { name: /^Show as:/ }).tap();
  await beat(500);
  await page.getByRole("radio", { name: "List" }).tap();
  await beat(700);
  await page.keyboard.press("Escape");
  await beat(1400);

  // 7 · the quiz
  await caption("Who thinks like you?");
  await page.evaluate(() => scrollTo({ top: 0, behavior: "smooth" }));
  await beat(900);
  await page.getByRole("link", { name: /Which of them think like you\?/ }).tap();
  await page.waitForURL(/\/quiz$/);
  await beat(2200);
  await page.getByRole("button", { name: "Begin" }).tap();
  for (let k = 0; k < STATEMENTS.length; k++) {
    const answer = async (pause: number) => {
      await beat(pause);
      await page.getByRole("button", { name: LABELS[ANSWERS[k] + 2], exact: true }).tap();
      await page.getByRole("region", { name: "Who agrees" }).waitFor();
      await beat(pause * 1.8);
      await page.getByRole("button", { name: k === STATEMENTS.length - 1 ? "See your results" : "Next statement" }).tap();
    };
    if (k < 2) await answer(1000);
    else if (k === 2) await fast(() => answer(700));
    else await fast(() => answer(450));
  }
  await page.getByRole("heading", { name: "Your philosophers" }).waitFor();
  await caption("Your closest minds. And five to argue with.");
  await beat(2400);
  await glideTo(page, 760, 1800);
  await beat(2200);

  // 8 · ranked for you, then the end card
  await page.getByRole("link", { name: /ranked for you/ }).tap();
  await page.waitForURL(/sort=match/);
  await caption("The whole wall, arranged around you.");
  await beat(2800);
  await caption("");
  await page.evaluate(() => (window as any).__end());
  await beat(2600);

  await stopCapture();
  const last = captions.at(-1);
  if (last && last.t1 === undefined) last.t1 = clock();
  const pngs = await renderCaptions(page, captions);
  await browser.close();
  encode(frames, fastRanges, captions, pngs, bg);
}

/** Smooth, human-paced scroll: `dy` pixels over `ms`, then a short rest. */
async function glide(page: Page, ms: number, dy: number) {
  await page.evaluate(
    ([t, d]) =>
      new Promise<void>((done) => {
        const y0 = scrollY;
        const t0 = performance.now();
        const step = (now: number) => {
          const k = Math.min(1, (now - t0) / t);
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          scrollTo(0, y0 + d * e);
          k < 1 ? requestAnimationFrame(step) : done();
        };
        requestAnimationFrame(step);
      }),
    [ms, dy] as const,
  );
}

async function glideTo(page: Page, y: number, ms: number) {
  const here = await page.evaluate(() => scrollY);
  await glide(page, ms, y - here);
}

async function openMenu(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).tap();
  await page.getByRole("dialog", { name }).waitFor();
  await page.waitForTimeout(700);
}

async function clearFilters(page: Page) {
  const chips = page.getByRole("button", { name: /^Remove filter:/ });
  while (await chips.count()) {
    await chips.first().tap();
    await page.waitForTimeout(350);
  }
}

async function tapFace(page: Page, slug: string) {
  const face = page.locator(`[data-slug="${slug}"] a`);
  await face.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await face.tap();
  await page.getByRole("dialog", { name: /preview$/ }).waitFor();
}

/** A one-finger touch drag, as real touch events. */
async function drag(page: Page, from: [number, number], to: [number, number], steps = 18) {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", p?: [number, number]) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: p ? [{ x: p[0], y: p[1] }] : [] });
  await touch("touchStart", from);
  for (let i = 1; i <= steps; i++) {
    await touch("touchMove", [from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps]);
    await page.waitForTimeout(16);
  }
  await touch("touchEnd");
  await cdp.detach();
}

const swipe = (page: Page, dir: "left" | "right") => drag(page, dir === "left" ? [320, 420] : [70, 420], dir === "left" ? [60, 420] : [330, 420]);
const pull = (page: Page, y0: number, y1: number) => drag(page, [195, y0], [195, y1], 24);

/** Each caption as a transparent, band-sized PNG, set in the site's own fonts. */
async function renderCaptions(page: Page, captions: Caption[]) {
  await page.evaluate(() => {
    document.body.innerHTML = '<div id="c"></div>';
    document.documentElement.style.background = "transparent";
    document.body.style.cssText = "background:transparent;margin:0;overflow:hidden";
  });
  await page.setViewportSize({ width: W, height: BAND / SCALE });
  const files: string[] = [];
  for (const [i, c] of captions.entries()) {
    await page.evaluate((text) => {
      const el = document.getElementById("c")!;
      el.textContent = text;
      el.style.cssText =
        'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:0 16px;color:#f6f1e7;text-align:center;' +
        'font:600 17px/1.2 "Instrument Sans Variable",system-ui,sans-serif;letter-spacing:.01em';
    }, c.text);
    const file = `${OUT}/cap-${i}.png`;
    await page.screenshot({ path: file, omitBackground: true });
    files.push(file);
  }
  return files;
}

/** ffmpeg: frames at their real times, `fast` ranges at FAST x, a caption band on top, 60 fps H.264. */
function encode(frames: Frame[], fastRanges: Array<[number, number]>, captions: Caption[], pngs: string[], bg: string) {
  if (frames.length < 2) throw new Error("no frames captured");
  const lines: string[] = [];
  const outAt: number[] = []; // seconds into the video at which each frame starts
  let total = 0;
  frames.forEach((f, i) => {
    const next = frames[i + 1]?.ts ?? f.ts + 0.6;
    let d = Math.max(0.001, next - f.ts);
    if (fastRanges.some(([a, b]) => f.ts >= a && f.ts <= b)) d /= FAST;
    outAt.push(total);
    total += d;
    lines.push(`file '${f.file.replace(`${OUT}/`, "")}'`, `duration ${d.toFixed(4)}`);
  });
  lines.push(`file '${frames.at(-1)!.file.replace(`${OUT}/`, "")}'`); // concat quirk: last file repeated
  writeFileSync(`${OUT}/frames.txt`, lines.join("\n"));

  const toOut = (ts: number) => {
    const i = frames.findIndex((f) => f.ts >= ts);
    return i < 0 ? total : outAt[i];
  };
  const [r, g, b] = (bg.match(/\d+/g) ?? ["21", "19", "17"]).map(Number);
  const hex = [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

  const inputs = ["-f", "concat", "-safe", "0", "-i", `${OUT}/frames.txt`];
  const chains = [`[0:v]fps=60,scale=trunc(iw/2)*2:trunc(ih/2)*2,pad=iw:ih+${BAND}:0:${BAND}:color=0x${hex},format=yuv420p[v0]`];
  captions.forEach((c, i) => {
    const a = toOut(c.t0);
    const len = Math.max(0.8, toOut(c.t1!) - a - 0.15);
    inputs.push("-loop", "1", "-framerate", "60", "-t", len.toFixed(3), "-i", pngs[i]);
    chains.push(
      `[${i + 1}:v]format=rgba,fade=t=in:st=0:d=0.35:alpha=1,fade=t=out:st=${(len - 0.35).toFixed(3)}:d=0.35:alpha=1,setpts=PTS+${a.toFixed(3)}/TB[c${i}]`,
      `[v${i}][c${i}]overlay=0:0:eof_action=pass:format=auto[v${i + 1}]`,
    );
  });
  chains.push(`[v${captions.length}]format=yuv420p[out]`);
  execFileSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", ...inputs, "-filter_complex", chains.join(";"), "-map", "[out]", "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-movflags", "+faststart", `${OUT}/demo.mp4`],
    { stdio: "inherit" },
  );
  console.log(`${frames.length} frames, ~${total.toFixed(1)}s -> ${OUT}/demo.mp4`);
}

void main();
