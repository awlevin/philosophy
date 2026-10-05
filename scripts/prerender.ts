/**
 * Prerender "/" and every "/p/:slug" into dist/ so pages paint before JS loads
 * (and are linkable/crawlable). Runs after `vite build` + the SSR build.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

function page(url: string, title: string, description: string) {
  return template
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(description)}"`)
    .replace('<div id="root"></div>', `<div id="root">${render(url)}</div>`);
}

await writeFile(
  path.join(DIST, "index.html"),
  page("/", "Philosophers — A Cheat Sheet", "Sixty-one philosophers from Thales to Foucault, each in a handful of skimmable facts."),
);

await mkdir(path.join(DIST, "p"), { recursive: true });
for (const p of philosophers as { slug: string; name: string; facts: string[] }[]) {
  await writeFile(
    path.join(DIST, "p", `${p.slug}.html`),
    page(`/p/${p.slug}`, `${p.name} — Philosophers`, `${p.name}: ${p.facts.slice(0, 2).join(" ")}`),
  );
}

await rm(SERVER, { recursive: true, force: true });
console.log(`Prerendered ${philosophers.length + 1} pages.`);
