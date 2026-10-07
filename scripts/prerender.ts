/**
 * Prerender "/", "/quiz" and every "/p/:slug" into dist/ so pages paint before JS loads
 * (and are linkable/crawlable). Runs after `vite build` + the SSR build.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Philosopher } from "../src/data/types";
import { lifespan } from "../src/lib/format";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const SERVER = path.join(ROOT, "dist-server");

const { render, philosophers } = await import(pathToFileURL(path.join(SERVER, "entry-server.js")).href);
let template = await readFile(path.join(DIST, "index.html"), "utf8");

// Inline the (small, ~8 KB gzipped) stylesheet: one less render-blocking round trip.
const cssLink = template.match(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/);
if (cssLink) {
  const css = await readFile(path.join(DIST, cssLink[1]), "utf8");
  template = template.replace(cssLink[0], () => `<style>${css}</style>`);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const SITE = "https://butwhy.aaronideas.com";

/** At most 160 characters, cut at a word break. */
function clip(s: string, max = 160) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

/** Slack and others cache preview images by URL, so the URL changes whenever the image does. */
function versioned(image: string) {
  const hash = createHash("sha1").update(readFileSync(path.join(ROOT, "public", image))).digest("hex").slice(0, 8);
  return `${image}?v=${hash}`;
}

function page(url: string, title: string, description: string, image: string, imageAlt: string, [w, h] = [1200, 630]) {
  const d = esc(description);
  const social = [
    `<link rel="canonical" href="${SITE}${url === "/" ? "" : url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Philosophers" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${SITE}${url === "/" ? "" : url}" />`,
    `<meta property="og:image" content="${SITE}${versioned(image)}" />`,
    `<meta property="og:image:width" content="${w}" />`,
    `<meta property="og:image:height" content="${h}" />`,
    `<meta property="og:image:alt" content="${esc(imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join("\n    ");
  return template
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${d}" />`)
    .replace(/<!--social-->[\s\S]*?<!--\/social-->/, () => social)
    .replace('<div id="root"></div>', `<div id="root">${render(url)}</div>`);
}

const HOME = ["/", "Philosophers Quick Reference", "Sixty-one philosophers with skimmable facts about each of them."] as const;
await writeFile(
  path.join(DIST, "index.html"),
  page(...HOME, "/og/home.jpg", "A wall of philosopher portraits beside the title Philosophers"),
);
// Slack crops wide previews to a small square, so its crawler (see vercel.json) gets the wall of faces alone.
await writeFile(
  path.join(DIST, "slack.html"),
  page(...HOME, "/og/slack-home.jpg", "A wall of philosopher portraits", [800, 800]),
);

await writeFile(
  path.join(DIST, "quiz.html"),
  page(
      "/quiz",
      "Who thinks like you? — Philosophers",
      "React to 14 statements. See which of 61 philosophers you agree with most.",
      "/og/quiz.jpg",
      "The quiz statement “You can’t be truly certain of anything.” above an agree and disagree scale",
    ),
);

await mkdir(path.join(DIST, "p"), { recursive: true });
for (const p of philosophers as Philosopher[]) {
  await writeFile(
    path.join(DIST, "p", `${p.slug}.html`),
    page(
      `/p/${p.slug}`,
      `${p.name} (${lifespan(p)}) — Philosophers`,
      clip(p.facts.slice(0, 2).join(" ")),
      `/og/p/${p.slug}.jpg`,
      `Portrait of ${p.name}`,
    ),
  );
}

await rm(SERVER, { recursive: true, force: true });
console.log(`Prerendered ${philosophers.length + 2} pages.`);
