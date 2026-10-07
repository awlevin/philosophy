/**
 * Profiles the main flows of a built site in headless Chrome, as a phone with a slowed CPU.
 * For each step: frame pacing (from requestAnimationFrame), long animation frames with the scripts
 * behind them, main-thread time by kind (script, style, layout, paint…), forced layouts, and the
 * hottest functions (mapped through source maps when the build has them).
 *
 *   npx tsx scripts/perf-profile.ts <site dir> [--cpu 4] [--out report.json] [--desktop] [--webkit] [--only <regex>]
 *
 * --webkit runs Playwright's WebKit (close to Safari) instead: frame pacing only, as WebKit has no
 * tracing, profiler or CPU throttling to drive. PERF_TRACE_DIR=<dir> keeps each step's Chrome trace.
 */
import { chromium, webkit, type CDPSession, type Page } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SourceMapConsumer } from "source-map-js";
import { serveStatic } from "./serve-static";

const args = process.argv.slice(2);
const SITE = path.resolve(args[0] ?? "dist");
const opt = (name: string, d: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : d;
};
const CPU = Number(opt("cpu", "4"));
const OUT = opt("out", "");
const DESKTOP = args.includes("--desktop");
const WEBKIT = args.includes("--webkit");
/** Only measure steps whose name matches (the rest still run, to keep the flow intact). */
const ONLY = new RegExp(opt("only", "."));

const { url: BASE, server } = await serveStatic(SITE);

// ---------- Source maps ----------
const maps = new Map<string, SourceMapConsumer | null>();
function mapFrame(url: string, line: number, col: number): { source: string; line: number; name?: string } | null {
  const file = url.startsWith(BASE) ? path.join(SITE, new URL(url).pathname) : "";
  if (!file) return null;
  if (!maps.has(file)) maps.set(file, existsSync(`${file}.map`) ? new SourceMapConsumer(JSON.parse(readFileSync(`${file}.map`, "utf8"))) : null);
  const m = maps.get(file);
  if (!m) return null;
  const pos = m.originalPositionFor({ line: line + 1, column: col });
  if (!pos.source) return null;
  return { source: pos.source.replace(/^.*node_modules\//, "").replace(/^(\.\.\/)+/, ""), line: pos.line, name: pos.name ?? undefined };
}
/** "react-dom", "framer-motion", "src/components/FilterBar.tsx"… */
const pkgOf = (source: string) => {
  if (source.startsWith("src/")) return source;
  const parts = source.split("/");
  return parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
};

// ---------- In-page probes ----------
// A string, not a function: tsx would wrap a function with helpers that don't exist in the page.
const PROBE = `
  window.__perf = { frames: [], loafs: [], on: false };
  const tick = (t) => {
    if (window.__perf.on) window.__perf.frames.push(t);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  if (PerformanceObserver.supportedEntryTypes.includes("long-animation-frame")) new PerformanceObserver((list) => {
    if (!window.__perf.on) return;
    for (const e of list.getEntries()) {
      const end = e.startTime + e.duration;
      window.__perf.loafs.push({
        duration: e.duration,
        blocking: e.blockingDuration,
        styleLayout: e.styleAndLayoutStart ? end - e.styleAndLayoutStart : 0,
        scripts: e.scripts.map((s) => ({
          invoker: s.invoker,
          fn: s.sourceFunctionName,
          url: s.sourceURL,
          duration: s.duration,
          forced: s.forcedStyleAndLayoutDuration,
        })),
      });
    }
  }).observe({ type: "long-animation-frame" });
`;
type Probe = { frames: number[]; loafs: { duration: number; blocking: number; styleLayout: number; scripts: { invoker: string; fn: string; url: string; duration: number; forced: number }[] }[] };

type StepReport = {
  step: string;
  frames: number;
  wallMs: number;
  avgFrameMs: number;
  p95FrameMs: number;
  maxFrameMs: number;
  /** Frames that should have been drawn at 60 Hz but weren't. */
  dropped: number;
  /** Every gap between frames, in order (ms). */
  gaps: number[];
  longFrames: { duration: number; blocking: number; styleLayout: number; scripts: { invoker: string; fn: string; where: string; duration: number; forced: number }[] }[];
  mainThread: Record<string, number>;
  forcedLayouts: { count: number; ms: number };
  layouts: { count: number; ms: number; maxDirty: number };
  styleRecalcs: { count: number; ms: number; maxElements: number };
  paints: number;
  /** Compositor frames with visual changes: drawn with every update, drawn without the main thread's (partial), or dropped. */
  compositor: { full: number; partial: number; dropped: number };
  /** Raster work across raster threads (ms). */
  rasterMs: number;
  hot: { fn: string; where: string; selfMs: number }[];
  byPackage: Record<string, number>;
};

const TRACE_CATEGORIES = [
  "devtools.timeline",
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "blink.user_timing",
  "v8.execute",
  // Stacks on Layout events: a layout with a JS stack was forced by script.
  "disabled-by-default-devtools.timeline.stack",
];

async function measure(page: Page, cdp: CDPSession | null, step: string, act: () => Promise<void>, settle: number): Promise<StepReport> {
  if (cdp) {
    await page.context().browser()!.startTracing(page, { categories: TRACE_CATEGORIES });
    await cdp.send("Profiler.start");
  }
  // Starting the profilers stalls a frame or two; let that pass before counting.
  await page.waitForTimeout(300);
  await page.evaluate("Object.assign(window.__perf, { frames: [], loafs: [], on: true })");
  const t0 = Date.now();
  await act();
  await page.waitForTimeout(settle);
  const wallMs = Date.now() - t0;
  const profile = cdp ? (await cdp.send("Profiler.stop")).profile : { nodes: [] };
  const raw = cdp ? await page.context().browser()!.stopTracing() : Buffer.from('{"traceEvents":[]}');
  if (process.env.PERF_TRACE_DIR) writeFileSync(path.join(process.env.PERF_TRACE_DIR, `${step.replace(/\W+/g, "-")}.json`), raw);
  const trace = JSON.parse(raw.toString()) as { traceEvents: TraceEvent[] };
  const probe = (await page.evaluate("(window.__perf.on = false, window.__perf)")) as Probe;

  // Frame pacing.
  const gaps = probe.frames.slice(1).map((t, i) => t - probe.frames[i]);
  const sorted = [...gaps].sort((a, b) => a - b);
  const dropped = gaps.reduce((n, g) => n + Math.max(0, Math.round(g / 16.67) - 1), 0);

  return {
    step,
    frames: probe.frames.length,
    wallMs,
    avgFrameMs: round(gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length)),
    p95FrameMs: round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
    maxFrameMs: round(sorted.at(-1) ?? 0),
    dropped,
    gaps: gaps.map(round),
    longFrames: probe.loafs.map((l) => ({
      duration: round(l.duration),
      blocking: round(l.blocking),
      styleLayout: round(l.styleLayout),
      scripts: l.scripts
        .filter((s) => s.duration >= 2)
        .map((s) => ({ invoker: s.invoker, fn: s.fn, where: s.url.replace(BASE, ""), duration: round(s.duration), forced: round(s.forced) })),
    })),
    ...analyzeTrace(trace.traceEvents),
    ...analyzeProfile(profile),
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

// ---------- Trace: main-thread self time by event ----------
type TraceEvent = { name: string; ph: string; ts: number; dur?: number; pid: number; tid: number; args?: Record<string, any>; cat?: string };
function analyzeTrace(events: TraceEvent[]) {
  const main = events.find((e) => e.name === "thread_name" && e.args?.name === "CrRendererMain" && events.some((x) => x.pid === e.pid && x.name === "Layout"));
  const onMain = events.filter((e) => main && e.pid === main.pid && e.tid === main.tid && e.ph === "X" && e.dur != null).sort((a, b) => a.ts - b.ts || b.dur! - a.dur!);
  const self: Record<string, number> = {};
  const stack: TraceEvent[] = [];
  const childTime = new Map<TraceEvent, number>();
  const close = (until: number) => {
    while (stack.length && stack.at(-1)!.ts + stack.at(-1)!.dur! <= until) {
      const e = stack.pop()!;
      const s = e.dur! - (childTime.get(e) ?? 0);
      self[e.name] = (self[e.name] ?? 0) + s;
      if (stack.length) childTime.set(stack.at(-1)!, (childTime.get(stack.at(-1)!) ?? 0) + e.dur!);
    }
  };
  for (const e of onMain) {
    close(e.ts);
    stack.push(e);
  }
  close(Infinity);
  const KIND: Record<string, string> = {
    FunctionCall: "script",
    EvaluateScript: "script",
    "v8.compile": "script",
    "v8.callFunction": "script",
    TimerFire: "script",
    FireAnimationFrame: "script",
    EventDispatch: "script",
    RunMicrotasks: "script",
    "V8.GCScavenger": "gc",
    MinorGC: "gc",
    MajorGC: "gc",
    "V8.GC_MC_BACKGROUND_MARKING": "gc",
    UpdateLayoutTree: "style",
    ScheduleStyleRecalculation: "style",
    Layout: "layout",
    PrePaint: "prepaint",
    Paint: "paint",
    PaintImage: "paint",
    Layerize: "layerize",
    Commit: "commit",
    UpdateLayer: "paint",
    HitTest: "hit-test",
    ParseHTML: "parse",
    ParseAuthorStyleSheet: "parse",
    "Decode Image": "image-decode",
    ImageDecodeTask: "image-decode",
  };
  const mainThread: Record<string, number> = {};
  for (const [name, us] of Object.entries(self)) {
    const k = KIND[name] ?? (name.startsWith("V8.") || name.startsWith("v8.") ? "script" : "other");
    mainThread[k] = round((mainThread[k] ?? 0) + us / 1000);
  }
  const layouts = onMain.filter((e) => e.name === "Layout");
  const forced = layouts.filter((e) => e.args?.beginData?.stackTrace?.length);
  const styles = onMain.filter((e) => e.name === "UpdateLayoutTree");
  const ms = (list: TraceEvent[]) => round(list.reduce((a, e) => a + e.dur!, 0) / 1000);
  return {
    mainThread,
    forcedLayouts: { count: forced.length, ms: ms(forced) },
    layouts: { count: layouts.length, ms: ms(layouts), maxDirty: Math.max(0, ...layouts.map((e) => e.args?.beginData?.dirtyObjects ?? 0)) },
    styleRecalcs: { count: styles.length, ms: ms(styles), maxElements: Math.max(0, ...styles.map((e) => e.args?.elementCount ?? 0)) },
    paints: onMain.filter((e) => e.name === "Paint").length,
    compositor: compositorFrames(events),
    rasterMs: round(events.filter((e) => e.ph === "X" && (e.name === "RasterTask" || e.name === "ImageDecodeTask")).reduce((a, e) => a + (e.dur ?? 0), 0) / 1000),
  };
}

/** Frame outcomes as the compositor reports them, which rAF can't see: a frame can tick on time yet show stale main-thread work. */
function compositorFrames(events: TraceEvent[]) {
  const out = { full: 0, partial: 0, dropped: 0 };
  for (const e of events) {
    if (e.name !== "PipelineReporter" || !e.args?.frame_reporter) continue;
    const state = e.args.frame_reporter.state;
    if (state === "STATE_PRESENTED_ALL") out.full++;
    else if (state === "STATE_PRESENTED_PARTIAL") out.partial++;
    else if (state === "STATE_DROPPED") out.dropped++;
  }
  return out;
}

// ---------- CPU profile: self time by function ----------
type ProfileNode = { id: number; callFrame: { functionName: string; url: string; lineNumber: number; columnNumber: number }; children?: number[] };
function analyzeProfile(profile: { nodes: ProfileNode[]; samples?: number[]; timeDeltas?: number[] }) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const selfUs = new Map<number, number>();
  profile.samples?.forEach((id, i) => selfUs.set(id, (selfUs.get(id) ?? 0) + (profile.timeDeltas?.[i + 1] ?? 0)));
  const fns = new Map<string, { fn: string; where: string; us: number; pkg: string }>();
  for (const [id, us] of selfUs) {
    const { callFrame: f } = byId.get(id)!;
    if (["(idle)", "(program)", "(root)"].includes(f.functionName)) continue;
    const mapped = f.url ? mapFrame(f.url, f.lineNumber, f.columnNumber) : null;
    const where = mapped ? `${mapped.source}:${mapped.line}` : f.url ? `${f.url.replace(BASE, "")}:${f.lineNumber + 1}` : f.functionName;
    const pkg = mapped ? pkgOf(mapped.source) : f.functionName === "(garbage collector)" ? "(gc)" : f.url ? "(unmapped)" : "(native)";
    const key = `${f.functionName}@${where}`;
    const cur = fns.get(key) ?? { fn: f.functionName || "(anonymous)", where, us: 0, pkg };
    cur.us += us;
    fns.set(key, cur);
  }
  const byPackage: Record<string, number> = {};
  for (const f of fns.values()) {
    const k = f.pkg.startsWith("src/") ? "app" : f.pkg;
    byPackage[k] = round((byPackage[k] ?? 0) + f.us / 1000);
  }
  const hot = [...fns.values()]
    .sort((a, b) => b.us - a.us)
    .slice(0, 12)
    .map((f) => ({ fn: f.fn, where: f.where, selfMs: round(f.us / 1000) }));
  return { hot, byPackage };
}

// ---------- The flows ----------
const browser = await (WEBKIT ? webkit : chromium).launch({ headless: true });
const context = await browser.newContext(
  DESKTOP
    ? { viewport: { width: 1440, height: 900 }, colorScheme: "dark" }
    : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
);
await context.addInitScript(PROBE);
const page = await context.newPage();
const cdp = WEBKIT ? null : await context.newCDPSession(page);
await cdp?.send("Profiler.enable");
await cdp?.send("Profiler.setSamplingInterval", { interval: 100 });
await cdp?.send("Emulation.setCPUThrottlingRate", { rate: CPU });

const reports: StepReport[] = [];
const step = async (name: string, act: () => Promise<void>, settle = 1400) => {
  if (!ONLY.test(name)) {
    await act();
    await page.waitForTimeout(settle);
    return;
  }
  const r = await measure(page, cdp, name, act, settle);
  reports.push(r);
  const c = r.compositor;
  console.error(
    `${name.padEnd(28)} drops ${String(r.dropped).padStart(3)}  max ${String(r.maxFrameMs).padStart(5)}ms  LoAF ${r.longFrames.length}  frames full/partial/dropped ${c.full}/${c.partial}/${c.dropped}  raster ${r.rasterMs}ms`,
  );
};
const scrollBy = async (dy: number, speed = 1600) => {
  if (cdp) {
    await cdp.send("Input.synthesizeScrollGesture", { x: 195, y: 500, yDistance: -dy, speed, gestureSourceType: DESKTOP ? "mouse" : "touch" });
    return;
  }
  // WebKit has no synthetic gestures (nor wheel events on mobile): smooth-scroll whatever scrolls under the point.
  await page.evaluate(`{
    let el = document.elementFromPoint(195, 500);
    while (el && el !== document.documentElement && !(el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
    (el && el !== document.documentElement ? el : window).scrollBy({ top: ${dy}, behavior: "smooth" });
  }`);
  await page.waitForTimeout((Math.abs(dy) / speed) * 1000 + 300);
};

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

await step("idle (baseline)", async () => {}, 1000);
await step("scroll gallery", async () => {
  await scrollBy(1800);
  await scrollBy(-1800);
}, 600);

const openCard = (slug: string) => page.locator(`[data-slug="${slug}"] a`).first();
await openCard("plato").scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await step("open detail (card morph)", () => openCard("plato").click());
await step("next philosopher (→)", () => page.keyboard.press("ArrowRight"));
await step("scroll detail", async () => {
  await scrollBy(900);
  await scrollBy(-900);
}, 600);
await step("close detail (morph back)", () => page.getByRole("button", { name: "All philosophers" }).click());

if (DESKTOP) {
  await step("open Era popover", () => page.getByRole("button", { name: "Era", exact: true }).click(), 800);
} else {
  await page.evaluate("scrollTo(0, 0)");
  await page.waitForTimeout(300);
  await step("open Era sheet", () => page.getByRole("button", { name: "Era", exact: true }).click(), 800);
}
await step("pick Ancient (grid reflow)", () => page.getByRole("checkbox", { name: /^Ancient/ }).click());
await step("pick Medieval (grid reflow)", () => page.getByRole("checkbox", { name: /^Medieval/ }).click());
await step("close menu", () => page.getByRole("button", { name: /^Show \d+/ }).click(), 800);

if (!DESKTOP) {
  await openCard("socrates").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await step("peek (sheet up)", () => openCard("socrates").click(), 900);
  await step("peek → page (grow)", () => page.getByRole("button", { name: /^Open / }).click(), 1600);
} else {
  await step("open filtered detail", () => openCard("socrates").click());
}
await page.getByRole("link", { name: /^Greek: show all/ }).scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await step("detail chip → gallery (fly)", () => page.getByRole("link", { name: /^Greek: show all/ }).click(), 1800);
await step("clear filters (grid reflow)", () => page.getByRole("button", { name: "Clear", exact: true }).first().click());

if (DESKTOP) {
  await step("view → list", () => page.getByRole("radio", { name: "List" }).click());
  await step("view → faces", () => page.getByRole("radio", { name: "Faces" }).click());
} else {
  await page.evaluate("scrollTo(0, 0)");
  await page.getByRole("button", { name: /^Show as:/ }).click();
  await page.waitForTimeout(600);
  await step("view → list", () => page.getByRole("radio", { name: "List" }).click());
  await page.getByRole("button", { name: /^Show as:/ }).click();
  await page.waitForTimeout(600);
  await step("view → faces", () => page.getByRole("radio", { name: "Faces" }).click());
}
await step("order → A–Z (grid reflow)", async () => {
  await page.getByRole("button", { name: /^(By time|A–Z)$/ }).click();
  await page.getByRole("radio", { name: "A–Z" }).click();
});

await browser.close();
server.close();

if (OUT) writeFileSync(OUT, JSON.stringify(reports, null, 2));
else console.log(JSON.stringify(reports, null, 2));
