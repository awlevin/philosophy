/**
 * Screenshots two built sites the same way (phone, each theme and look, gallery and a detail page) and
 * reports how far apart they are, to check that a change meant to look the same does.
 *
 *   npx tsx scripts/compare-shots.ts <site A> <site B> <out dir> [--webkit]
 */
import { chromium, webkit } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { serveStatic } from "./serve-static";

const [a, b, out] = process.argv.slice(2).map((p) => path.resolve(p));
const engine = process.argv.includes("--webkit") ? webkit : chromium;
mkdirSync(out, { recursive: true });

const browser = await engine.launch();
const sites = await Promise.all([a, b].map(serveStatic));
const cases = [
  { name: "faces-light", theme: "light", view: "faces" },
  { name: "faces-dark", theme: "dark", view: "faces" },
  { name: "classic-light", theme: "light", view: "classic" },
  { name: "classic-dark", theme: "dark", view: "classic" },
];
for (const c of cases) {
  for (const route of ["/", "/p/plato"]) {
    const shots: Buffer[] = [];
    for (const { url } of sites) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      await ctx.addInitScript(`localStorage.setItem("theme", "${c.theme}"); localStorage.setItem("view", "${c.view}");`);
      const page = await ctx.newPage();
      await page.goto(url + route, { waitUntil: "networkidle" });
      if (route === "/") await page.evaluate("scrollTo(0, document.getElementById('grid').offsetTop - 120)");
      await page.waitForTimeout(800);
      shots.push(await page.screenshot());
      await ctx.close();
    }
    const [x, y] = await Promise.all(shots.map((s) => sharp(s).removeAlpha().raw().toBuffer()));
    let max = 0;
    let over = 0;
    for (let i = 0; i < x.length; i++) {
      const d = Math.abs(x[i] - y[i]);
      max = Math.max(max, d);
      if (d > 8) over++;
    }
    const tag = `${c.name}${route.replace(/\//g, "_")}`;
    await sharp(shots[0]).toFile(path.join(out, `${tag}-a.png`));
    await sharp(shots[1]).toFile(path.join(out, `${tag}-b.png`));
    console.log(`${tag.padEnd(28)} max Δ${max}  channels off by >8: ${over}`);
  }
}
await browser.close();
for (const { server } of sites) server.close();
