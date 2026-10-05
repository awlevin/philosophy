/**
 * Fetch portraits for every philosopher in src/data/philosophers.ts.
 *
 *   npm run fetch-portraits              # fetch everything missing
 *   npm run fetch-portraits -- --force   # re-download everything
 *   npm run fetch-portraits -- plato kant
 *
 * For each philosopher:
 *   1. Read Wikidata property P18 (image) for `wikidataId`
 *      (or use a hand-picked Commons file from OVERRIDES).
 *   2. Read author + license from the Commons imageinfo/extmetadata API.
 *   3. Reject anything that is not public domain / CC0 / CC BY(-SA).
 *   4. Download a thumbnail, write public/portraits/{slug}.jpg (600w) plus
 *      {slug}-480.jpg / {slug}-320.jpg for the grid, each with a lighter .avif twin.
 *   5. Rewrite that entry's `portrait: { … }` line in philosophers.ts.
 *
 * The Wikimedia APIs rate-limit shared IPs aggressively. Every API call retries
 * with backoff, and if the API keeps answering 429 we fall back to equivalent
 * non-API endpoints (Special:EntityData for Wikidata, the rendered File: page
 * for Commons license metadata — the same license templates extmetadata reads).
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { philosophers } from "../src/data/philosophers";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = path.join(ROOT, "src/data/philosophers.ts");
const OUT_DIR = path.join(ROOT, "public/portraits");
const UA = "PhilosophersCheatSheet/1.0 (https://github.com/awlevin/philosophy; portrait fetcher)";

/**
 * Hand-picked Commons files where P18 is missing, not a portrait, or a poor crop.
 * Keys are slugs; values are Commons file names (without "File:").
 */
const OVERRIDES: Record<string, string> = {
  // P18 is a busy group scene; this statue reads as a face at grid size.
  "adi-shankara": "Adi Sankara at SAT Temple.jpg",
  // P18s below are full-length statues / faded or faint images with tiny faces.
  diogenes: "Diogenes, bust-length, and turned to the right, holding a lantern MET DP836615.jpg",
  averroes: "Averroes. Lithograph by P. R. Vignéron, 1825. Wellcome V0000251.jpg",
  maimonides: "Moses Maimonides. Photogravure. Wellcome V0003789.jpg",
  zhuangzi: "Hui Zuli 華祖立—Zhuang Zhou 莊子 (1326).jpg",
  confucius: "Confucius Tang Dynasty (cropped).jpg",
  laozi: "Lao Tzu - Project Gutenberg eText 15250.jpg",
  // P18 is "Copyrighted free use", which isn't PD/CC; this Heian-period painting is PD.
  nagarjuna: "Eight Patriarchs of the Shingon Sect of Buddhism Nagarjuna Cropped.jpg",
};

/** Cleaner credit lines where Commons' Artist field is a URL, a note, or very long. */
const CREDITS: Record<string, string> = {
  confucius: "Attributed to Wu Daozi (Tang dynasty), stone rubbing",
  buddha: "Photo: พระมหาเทวประภาส วชิรญาณเมธี",
  boethius: "Glasgow University Library",
  avicenna: "After Abolhassan Sadighi",
  averroes: "P. R. Vignéron (1825), via Wellcome Collection",
  maimonides: "Wellcome Collection",
  "william-of-ockham": "Moscarlop",
  kierkegaard: "Royal Danish Library",
  rawls: "Alec Rawls (Harvard University Press, 1971)",
};

const FREE_LICENSE = /(public domain|^pd\b|^pd-|cc0|^cc[ -]by(?![- ]?nc)(?![- ]?nd))/i;

type Meta = { credit: string; license: string; sourceUrl: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, { tries = 4, accept429 = false } = {}): Promise<Response> {
  let delay = 1500;
  for (let i = 0; ; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA }, redirect: "follow" });
    if (res.ok) return res;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || i >= tries - 1) {
      if (res.status === 429 && accept429) return res;
      throw new Error(`${res.status} ${res.statusText} for ${url}`);
    }
    const ra = Number(res.headers.get("retry-after"));
    await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 30_000) : delay);
    delay *= 2;
  }
}

/* ----------------------------- Wikidata P18 ----------------------------- */

async function p18(qid: string): Promise<string | null> {
  const api = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P18&format=json`;
  let res = await get(api, { tries: 2, accept429: true });
  if (res.status === 429) {
    res = await get(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
    const json = (await res.json()) as any;
    const claims = json.entities?.[qid]?.claims?.P18 ?? [];
    return pickClaim(claims);
  }
  const json = (await res.json()) as any;
  return pickClaim(json.claims?.P18 ?? []);
}

function pickClaim(claims: any[]): string | null {
  if (!claims.length) return null;
  const preferred = claims.find((c) => c.rank === "preferred") ?? claims.find((c) => c.rank !== "deprecated");
  return preferred?.mainsnak?.datavalue?.value ?? null;
}

/* ------------------------- Commons license metadata ------------------------- */

const stripHtml = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/g, "")
    .replace(/\s+/g, " ")
    .trim();

function tidyCredit(s: string): string {
  let c = stripHtml(s)
    .replace(/^(author|artist)\s*:?\s*/i, "")
    .replace(/\s*\(\s*talk\s*\)/gi, "")
    .replace(/\s*Life time:.*$/i, "")
    .trim();
  if (!c || /^unknown/i.test(c)) c = "Unknown artist";
  return c.length > 90 ? c.slice(0, 87).trimEnd() + "…" : c;
}

async function commonsMeta(file: string): Promise<Meta> {
  const title = `File:${file}`;
  const sourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_")).replace(/%3A/g, ":")}`;
  const api =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo` +
    `&iiprop=extmetadata&titles=${encodeURIComponent(title)}`;
  const res = await get(api, { tries: 2, accept429: true });
  if (res.ok) {
    const json = (await res.json()) as any;
    const page = Object.values(json.query?.pages ?? {})[0] as any;
    const em = page?.imageinfo?.[0]?.extmetadata ?? {};
    return {
      credit: tidyCredit(em.Artist?.value ?? em.Credit?.value ?? ""),
      license: stripHtml(em.LicenseShortName?.value ?? em.License?.value ?? ""),
      sourceUrl,
    };
  }
  // API rate-limited: read the same license templates from the rendered file page.
  const html = await (await get(sourceUrl)).text();
  const short = html.match(/class="licensetpl_short"[^>]*>([^<]*)</)?.[1];
  const author =
    html.match(/id="fileinfotpl_aut"[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/)?.[1] ??
    html.match(/class="licensetpl_attr"[^>]*>([\s\S]*?)<\//)?.[1] ??
    "";
  return { credit: tidyCredit(author), license: stripHtml(short ?? ""), sourceUrl };
}

/* ------------------------------- Download ------------------------------- */

async function download(file: string, slug: string) {
  // Special:FilePath redirects to a standard-size thumbnail on upload.wikimedia.org.
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=960`;
  const buf = Buffer.from(await (await get(url)).arrayBuffer());
  const base = sharp(buf, { failOn: "none" }).rotate().flatten({ background: "#ffffff" });
  // 600w for the detail page, 480w/320w for grid cards; JPEG plus a much smaller AVIF of each.
  for (const [w, suffix] of [[600, ""], [480, "-480"], [320, "-320"]] as const) {
    const sized = base.clone().resize({ width: w, height: Math.round(w * 1.5), fit: "inside", withoutEnlargement: true });
    await sized.clone().jpeg({ quality: 76, mozjpeg: true, progressive: true }).toFile(path.join(OUT_DIR, `${slug}${suffix}.jpg`));
    await sized.clone().avif({ quality: 42, effort: 4 }).toFile(path.join(OUT_DIR, `${slug}${suffix}.avif`));
  }
}

/* ------------------------------ Data rewrite ------------------------------ */

const q = (s: string) => JSON.stringify(s);

function rewritePortrait(src: string, slug: string, meta: Meta & { src: string }): string {
  const start = src.indexOf(`slug: ${q(slug)}`);
  if (start < 0) throw new Error(`slug ${slug} not found in data file`);
  const re = /portrait: \{[^\n]*\},/g;
  re.lastIndex = start;
  const m = re.exec(src);
  if (!m) throw new Error(`portrait line not found for ${slug}`);
  // Keep hand-tuned crop fields (focus, zoom) across re-fetches.
  const kept = ["focus", "zoom"]
    .map((k) => m[0].match(new RegExp(`${k}: ("[^"]*"|[\\d.]+)`))?.[0])
    .filter(Boolean)
    .map((s) => `, ${s}`)
    .join("");
  const line =
    `portrait: { src: ${q(meta.src)}, credit: ${q(meta.credit)}, license: ${q(meta.license)}, ` +
    `sourceUrl: ${q(meta.sourceUrl)}${kept} },`;
  return src.slice(0, m.index) + line + src.slice(m.index + m[0].length);
}

/* --------------------------------- Main --------------------------------- */

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = new Set(args.filter((a) => !a.startsWith("--")));
  await mkdir(OUT_DIR, { recursive: true });

  let source = await readFile(DATA_FILE, "utf8");
  const fallbacks: { slug: string; reason: string }[] = [];

  for (const p of philosophers) {
    if (only.size && !only.has(p.slug)) continue;
    const have = existsSync(path.join(OUT_DIR, `${p.slug}.jpg`)) && p.portrait.src;
    if (have && !force) {
      console.log(`· ${p.slug} (cached)`);
      continue;
    }
    try {
      const file = OVERRIDES[p.slug] ?? (await p18(p.wikidataId));
      if (!file) throw new Error("no P18 image on Wikidata");
      const meta = await commonsMeta(file);
      if (!FREE_LICENSE.test(meta.license)) throw new Error(`license not allowed: "${meta.license || "unknown"}"`);
      await download(file, p.slug);
      if (CREDITS[p.slug]) meta.credit = CREDITS[p.slug];
      source = rewritePortrait(source, p.slug, { ...meta, src: `/portraits/${p.slug}.jpg` });
      console.log(`✓ ${p.slug.padEnd(18)} ${meta.license.padEnd(16)} ${file}`);
    } catch (err) {
      const reason = (err as Error).message;
      fallbacks.push({ slug: p.slug, reason });
      source = rewritePortrait(source, p.slug, { src: "", credit: "", license: "", sourceUrl: "" });
      console.log(`✗ ${p.slug.padEnd(18)} → monogram (${reason})`);
    }
    await writeFile(DATA_FILE, source); // persist progress after each entry
    await sleep(400);
  }

  console.log(
    fallbacks.length
      ? `\n${fallbacks.length} fell back to monograms:\n` + fallbacks.map((f) => `  - ${f.slug}: ${f.reason}`).join("\n")
      : "\nAll portraits fetched.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
