import { animate, m, useMotionValue, useTransform, type PanInfo, type Variants } from "framer-motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate, useNavigationType } from "react-router";
import { ArrowLeft, ArrowRight, Check, Close } from "../components/Icons";
import { Portrait } from "../components/Portrait";
import { ThemeToggle } from "../components/ThemeToggle";
import { bySlug, philosophers, type Philosopher } from "../data/philosophers";
import {
  EMPTY_FILTERS,
  activeTokens,
  applyFilters,
  filterChipId,
  hasToken,
  onlyToken,
  parseFilters,
  tokenKey,
  tokenSearch,
  type FilterToken,
} from "../lib/filters";
import { eraVars } from "../lib/era";
import { birthplace, lifespan, shortName } from "../lib/format";
import { useRanking } from "../lib/quiz";
import type { QuizState } from "./Quiz";
import { useLockPageScroll } from "../lib/useLockPageScroll";
import { usePullToDismiss } from "../lib/usePullToDismiss";
import { useViewMode } from "../lib/view";
import { EXITING_LAYER, PEEK_LEAD, ease, grow, morph, nameId, type SheetRect } from "../lib/motion";

export type DetailState = {
  /** Query string of the grid we came from, so it stays filtered underneath. */
  gridSearch?: string;
  /** Opened by clicking a card: closing can simply go back in history. */
  fromGrid?: boolean;
  /** -1 / 1 when reached via prev/next, for the slide direction. */
  dir?: -1 | 1;
  /** Opened from the peek sheet, which was here: the page grows out of it, so nothing flies in from the card. */
  fromPeek?: SheetRect;
  /** Opened from the quiz results: the page fades in over them, and closing goes back to them. */
  fromQuiz?: boolean;
};

/** History state of a gallery reached by tapping a chip on a detail page. */
export type GalleryState = {
  /** The philosopher we came from, for "Back to …". */
  fromDetail?: string;
  /** tokenKey of the chip that was tapped. */
  chip?: string;
};

const instant = { duration: 0 };

const factList: Variants = {
  hidden: { opacity: 0 },
  show: (delay: number) => ({
    opacity: 1,
    transition: { opacity: { duration: 0.3, delay }, staggerChildren: 0.075, delayChildren: delay },
  }),
};
const factItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};
const fadeOut = { opacity: 0, transition: { duration: 0.15 } };
/** Rises into place, `delay` seconds in (opening from the peek sheet, where nothing morphs). */
const rise = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease, delay },
});

export function Detail({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as DetailState;
  const scroller = useRef<HTMLDivElement>(null);

  const p = bySlug.get(slug);
  const [view] = useViewMode();
  const i = p ? philosophers.indexOf(p) : -1;
  const n = philosophers.length;
  const prev = philosophers[(i - 1 + n) % n];
  const next = philosophers[(i + 1) % n];
  const dir = state.dir ?? 0;

  const close = () => {
    if (state.fromGrid || state.fromQuiz) navigate(-1);
    else navigate({ pathname: "/", search: state.gridSearch ?? "" });
  };
  const go = (to: Philosopher, d: -1 | 1) =>
    navigate(`/p/${to.slug}`, { replace: true, state: { ...state, dir: d } satisfies DetailState });

  const present = useLockPageScroll();

  // On every philosopher change: reset the overlay scroll, and quietly scroll the grid underneath
  // so this philosopher's card is on screen — then closing always morphs back to a visible card.
  useLayoutEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    const card = document.querySelector<HTMLElement>(`[data-slug="${slug}"]`);
    if (card) {
      const r = card.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight) {
        window.scrollTo({ top: window.scrollY + r.top - window.innerHeight / 2 + r.height / 2, behavior: "instant" });
      }
    }
    if (p) document.title = `${p.name} — Philosophers`;
    return () => {
      document.title = "Philosophers — A Cheat Sheet";
    };
  }, [slug, p]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") close();
      else if (p && e.key === "ArrowLeft") go(prev, -1);
      else if (p && e.key === "ArrowRight") go(next, 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Swipe only on touch screens (mouse drags should select text). Set after mount for hydration.
  const [touch, setTouch] = useState(false);
  useEffect(() => setTouch(window.matchMedia("(pointer: coarse)").matches), []);

  // Pull down from the top to dismiss: the page shrinks, rounds and follows the finger, and the
  // gallery shows through behind it. On release it closes (and morphs into its card) or springs back.
  const pull = usePullToDismiss(scroller, { enabled: touch && present, onDismiss: close });
  const pullScale = useTransform(pull, [0, 420], [1, 0.84]);
  const pullRadius = useTransform(pull, [0, 80], [0, 28]);
  const backdrop = useTransform(pull, [0, 320], [1, 0.35]);
  const pulled = useTransform(pull, [0, 1], [0, 1]);
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -70 || info.velocity.x < -450) go(next, 1);
    else if (info.offset.x > 70 || info.velocity.x > 450) go(prev, -1);
  };

  // Only on the way in: coming back to this entry later (or reloading it) there is no sheet to grow from.
  const sheet = useNavigationType() === "PUSH" && !dir ? state.fromPeek : undefined;
  const fromPeek = !!sheet;
  // From the quiz there is no card on screen to morph from or back into.
  const fromQuiz = !!state.fromQuiz;
  const layoutTransition = dir || fromPeek ? instant : morph;
  // From the peek sheet, the page grows out of the sheet's place while its contents rise in one
  // after another. Their delays count from when the growth starts.
  const lead = fromPeek ? PEEK_LEAD : 0;
  const [grewFrom] = useState(sheet);
  const growth = useMotionValue(grewFrom ? 0 : 1);
  useEffect(() => {
    if (grewFrom) return animate(growth, 1, grow).stop;
  }, [grewFrom, growth]);
  const clipPath = useTransform(growth, (g) => {
    const k = Math.max(0, 1 - g);
    if (!grewFrom || k < 0.001) return "none";
    const { top, right, bottom, left, radii } = grewFrom;
    const [a, b, c, d] = radii.map((r) => r * k);
    return `inset(${top * k}px ${right * k}px ${bottom * k}px ${left * k}px round ${a}px ${b}px ${c}px ${d}px)`;
  });
  // Nothing morphs in from a card, so the name rises in with the rest.
  const nameRise = fromPeek ? rise(0.18 + lead) : undefined;
  // The growing surface starts in the sheet's color and turns into the page's.
  const sheetTint = useTransform(growth, [0, 1], [1, 0]);

  // Tapping a chip filters the gallery to that value. The chip takes a shared layoutId for a frame
  // first, so the gallery's pinned chip can fly from exactly where it was tapped.
  const similar = useMemo(() => (p ? similarTokens(p) : []), [p]);
  const [launching, setLaunching] = useState<string | null>(null);
  useEffect(() => setLaunching(null), [slug]);
  const launch = (e: MouseEvent, t: FilterToken) => {
    if (!p || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const to = { pathname: "/", search: tokenSearch(t) };
    const next: GalleryState = { fromDetail: p.slug, chip: tokenKey(t) };
    // Already filtered by this value underneath: its chip is in the bar already, nothing to fly.
    if (hasToken(parseFilters(state.gridSearch ?? ""), t)) return navigate(to, { state: next });
    setLaunching(tokenKey(t));
    requestAnimationFrame(() => navigate(to, { state: next }));
  };

  return (
    <m.div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={p ? p.name : "Not found"}
      // Keeps the overlay mounted while children run their exit animations.
      exit={{ opacity: 1, transition: { duration: 0.45 } }}
      // …and lets touches and wheels through to the gallery meanwhile, sinking under the bar.
      style={{ clipPath, ...(!present && { pointerEvents: "none", zIndex: EXITING_LAYER }) }}
    >
      <m.div style={{ opacity: backdrop }} className="absolute inset-0">
        <m.div
          className="absolute inset-0 bg-paper"
          initial={fromPeek ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.32, ease: "easeOut" } }}
          transition={{ duration: 0.3 }}
        >
          {fromPeek && <m.div style={{ opacity: sheetTint }} className="absolute inset-0 bg-[var(--sheet)]" />}
        </m.div>
      </m.div>

      {/* The page's own sheet of paper, shown only while pulled, so it reads as a card being lifted. */}
      <m.div aria-hidden exit={{ opacity: 0, transition: { duration: 0.2, ease: "easeOut" } }} className="absolute inset-0">
        <m.div
          style={{ y: pull, scale: pullScale, borderRadius: pullRadius, transformOrigin: "50% 20%", opacity: pulled }}
          className="absolute inset-0 bg-paper shadow-[var(--shadow-lift)]"
        />
      </m.div>

      <m.div
        ref={scroller}
        layoutScroll
        style={{ y: pull, scale: pullScale, borderRadius: pullRadius, transformOrigin: "50% 20%" }}
        className="relative h-full overflow-x-hidden overflow-y-auto overscroll-contain"
      >
        <m.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={fadeOut}
          transition={{ duration: 0.3, delay: 0.1 + lead }}
          className="sticky top-0 z-10 bg-gradient-to-b from-paper via-paper/90 to-transparent"
        >
          <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-3 sm:px-8 sm:py-5">
            <button
              type="button"
              onClick={close}
              className="-ml-2 inline-flex items-center gap-2 rounded-full px-2 py-2 text-[0.85rem] font-medium text-ink-2 hover:text-ink"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
              All philosophers
            </button>
            <div className="flex items-center gap-1">
              {p && (
                <span className="eyebrow mr-2 tabular-nums">
                  {i + 1} / {n}
                </span>
              )}
              <ThemeToggle />
            </div>
          </div>
        </m.nav>

        {p ? (
          <m.article
            key={p.slug}
            initial={dir ? { opacity: 0, x: dir * 56 } : fromQuiz ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.4, ease }}
            drag={touch ? "x" : false}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            dragSnapToOrigin
            onDragEnd={onDragEnd}
            style={{ touchAction: "pan-y", ...eraVars(p.era) }}
            className="mx-auto max-w-[1280px] px-4 pt-2 pb-16 sm:px-8 md:pt-6"
          >
            <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-14 lg:gap-20">
              <div>
                <m.div className="md:sticky md:top-24" {...(fromPeek && rise(lead))}>
                  <Portrait
                    p={p}
                    eager
                    priority
                    withGridPlaceholder={!!state.fromGrid}
                    sizes="(min-width: 1280px) 500px, (min-width: 768px) 40vw, 92vw"
                    radius={view === "classic" ? 4 : 16}
                    className="mx-auto w-full max-w-[460px] shadow-[var(--shadow)] md:max-w-none"
                    layoutTransition={layoutTransition}
                    shared={!fromQuiz}
                  />
                  <m.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={fadeOut}
                    transition={{ delay: 0.35 + lead, duration: 0.4 }}
                    className="mx-auto mt-3 max-w-[460px] text-[0.7rem] leading-relaxed text-muted md:max-w-none"
                  >
                    <Credit p={p} />
                  </m.p>
                </m.div>
              </div>

              <div className="min-w-0">
                <m.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={fadeOut}
                  transition={{ delay: dir ? 0 : 0.15 + lead, duration: 0.45, ease }}
                  className="eyebrow"
                  style={{ color: "var(--era-ink)" }}
                >
                  {p.era} · {p.tradition.join(" / ")}
                </m.p>

                <m.h1
                  layoutId={fromQuiz ? undefined : nameId(p.slug)}
                  layoutCrossfade={false}
                  initial={nameRise?.initial}
                  animate={nameRise?.animate}
                  // Fades when the card shows a short name, so there is nothing to morph into.
                  exit={fadeOut}
                  transition={{ ...nameRise?.transition, layout: layoutTransition }}
                  className="mt-3 origin-top-left font-display text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.01em] text-balance text-ink sm:text-[3.75rem] lg:text-[4.5rem]"
                >
                  {p.name}
                </m.h1>

                <m.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={fadeOut}
                  transition={{ delay: dir ? 0.03 : 0.2 + (fromPeek ? 0.04 + lead : 0), duration: 0.45, ease }}
                >
                  {p.aka && <p className="mt-1 font-display text-[1.5rem] text-ink-2 italic">{p.aka}</p>}
                  <p className="mt-3 text-[0.95rem] tracking-[0.06em] text-ink-2 tabular-nums">{lifespan(p)}</p>
                  <p className="mt-1 text-[0.95rem] text-ink-2">
                    {p.origin.traditional ? "By tradition born in" : "Born in"} {birthplace(p)}
                  </p>
                  <YouAnd p={p} gridSearch={state.gridSearch ?? ""} />
                  <p className="eyebrow mt-6">See others like {p.name}</p>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label={`See others like ${p.name}`}>
                    {similar.map(({ t, count }) => (
                      <li key={tokenKey(t)}>
                        <SimilarChip t={t} count={count} launching={launching === tokenKey(t)} onClick={(e) => launch(e, t)} />
                      </li>
                    ))}
                  </ul>
                </m.div>

                <m.ol
                  className="mt-10 border-t border-rule md:mt-12"
                  variants={factList}
                  custom={dir ? 0.06 : 0.3 + (fromPeek ? 0.04 + lead : 0)}
                  initial="hidden"
                  animate="show"
                  exit={fadeOut}
                >
                  {p.facts.map((f, k) => (
                    <m.li
                      key={k}
                      variants={factItem}
                      className="flex gap-4 border-b border-rule py-5 sm:gap-6 sm:py-6"
                    >
                      <span className="eyebrow w-5 shrink-0 pt-[0.9em] text-right tabular-nums sm:w-6" style={{ color: "var(--era-ink)" }} aria-hidden>
                        {toRoman(k + 1)}
                      </span>
                      <p className="font-display text-[clamp(1.75rem,1.25rem+1.5vw,2.5rem)] leading-[1.14] font-medium text-pretty text-ink">
                        {f}
                      </p>
                    </m.li>
                  ))}
                </m.ol>
              </div>
            </div>

            <m.nav
              aria-label="Chronological navigation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={fadeOut}
              transition={{ delay: dir ? 0 : 0.5 + lead, duration: 0.4 }}
              className="mt-14 grid grid-cols-2 gap-4 sm:gap-8"
            >
              <PagerLink p={prev} label="Earlier" side="left" onClick={() => go(prev, -1)} />
              <PagerLink p={next} label="Later" side="right" onClick={() => go(next, 1)} />
            </m.nav>
            <p className="mt-6 hidden text-center text-[0.72rem] text-muted md:block">
              Use ← → to move through time · Esc to return
            </p>
          </m.article>
        ) : (
          <div className="mx-auto max-w-xl px-4 py-24 text-center">
            <p className="font-display text-4xl text-ink-2 italic">No philosopher by that name.</p>
            <Link to="/" className="mt-6 inline-block text-sm font-medium text-accent">
              Back to all philosophers
            </Link>
          </div>
        )}
      </m.div>

      {p && (
        <>
          <SideArrow side="left" label={`Earlier: ${prev.name}`} onClick={() => go(prev, -1)} />
          <SideArrow side="right" label={`Later: ${next.name}`} onClick={() => go(next, 1)} />
        </>
      )}
    </m.div>
  );
}

/** Era, traditions and Big Questions of a philosopher, each with how many share it. */
function similarTokens(p: Philosopher): { t: FilterToken; count: number }[] {
  const own = { ...EMPTY_FILTERS, eras: [p.era], traditions: [...p.tradition], questions: p.questions };
  return activeTokens(own).map((t) => ({ t, count: applyFilters(philosophers, onlyToken(t)).length }));
}

function SimilarChip({
  t,
  count,
  launching,
  onClick,
}: {
  t: FilterToken;
  count: number;
  launching: boolean;
  onClick: (e: MouseEvent) => void;
}) {
  const body = (
    <>
      {t.group === "era" && <span className={`h-2 w-2 rounded-full ${launching ? "bg-paper" : "bg-[var(--era)]"}`} />}
      <span>{t.value}</span>
      <span className={`tabular-nums ${launching ? "text-paper/60" : "text-muted"}`}>{count}</span>
    </>
  );
  const chip = "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[0.8rem] whitespace-nowrap";
  return (
    <Link
      to={{ pathname: "/", search: tokenSearch(t) }}
      onClick={onClick}
      aria-label={`${t.value}: show all ${count}`}
      className="group block rounded-full"
    >
      {launching ? (
        <m.span layoutId={filterChipId(t)} transition={{ layout: morph }} className={`${chip} bg-ink text-paper`}>
          <m.span layout="position" className="inline-flex items-center gap-2">
            {body}
          </m.span>
        </m.span>
      ) : (
        <span
          className={`${chip} border border-rule text-ink-2 transition-colors group-hover:border-ink group-hover:text-ink ${
            t.group === "question" ? "" : "font-medium"
          }`}
        >
          {body}
        </span>
      )}
    </Link>
  );
}

function Credit({ p }: { p: Philosopher }) {
  const { src, credit, license, sourceUrl } = p.portrait;
  if (!src) return <>No freely licensed portrait available; monogram shown instead.</>;
  return (
    <>
      Portrait: {credit} · {license} ·{" "}
      <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-rule underline-offset-2 hover:text-ink">
        Wikimedia Commons
      </a>
    </>
  );
}

function PagerLink({ p, label, side, onClick }: { p: Philosopher; label: string; side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-w-0 flex-col gap-1 border-t border-rule pt-4 ${side === "right" ? "items-end text-right" : "items-start text-left"}`}
    >
      <span className="eyebrow inline-flex items-center gap-1.5">
        {side === "left" && <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />}
        {label}
        {side === "right" && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
      </span>
      <span className="max-w-full truncate font-display text-[1.35rem] font-semibold text-ink-2 group-hover:text-ink sm:text-[1.75rem]">
        {p.name}
      </span>
      <span className="text-[0.75rem] text-muted tabular-nums">{lifespan(p)}</span>
    </button>
  );
}

function SideArrow({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  return (
    <m.button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={fadeOut}
      transition={{ delay: 0.4 }}
      className={`fixed top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-rule bg-paper/80 text-ink-2 backdrop-blur transition-colors hover:border-ink hover:text-ink xl:grid ${
        side === "left" ? "left-5" : "right-5"
      }`}
    >
      {side === "left" ? <ArrowLeft /> : <ArrowRight />}
    </m.button>
  );
}

/** After the quiz: how close this philosopher sits to the reader, and on what. */
function YouAnd({ p, gridSearch }: { p: Philosopher; gridSearch: string }) {
  const ranking = useRanking();
  const match = ranking?.bySlug.get(p.slug);
  if (!ranking || !match) return null;
  const short = shortName(p);
  // Up to four reasons: some shared, some not, when both exist.
  const all = [...match.meet.map((r) => ({ ok: true, r })), ...match.split.map((r) => ({ ok: false, r }))];
  const first = [...all.filter((x) => x.ok).slice(0, 2), ...all.filter((x) => !x.ok).slice(0, 2)];
  const marks = [...first, ...all.filter((x) => !first.includes(x))].slice(0, 4);
  const results = (className: string) => (
    <Link
      to="/quiz"
      state={{ gridSearch } satisfies QuizState}
      className={`inline-flex min-h-11 items-center gap-1.5 text-[0.85rem] font-medium text-accent ${className}`}
    >
      Your results
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
  return (
    <m.section
      aria-label={`You and ${short}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      className="mt-6 rounded-2xl bg-paper-2 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-display text-[2.6rem] leading-none font-semibold text-accent tabular-nums">{match.pct}%</span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">You &amp; {short}</p>
          <p className="mt-1 text-[0.85rem] text-ink-2">
            No. {match.rank} of {ranking.list.length} for you · sided with you on {match.agree} of {match.n}
          </p>
        </div>
        {/* Beside the score on wider screens; under the reasons on phones, where the row is tight. */}
        {results("max-sm:hidden")}
      </div>
      {marks.length > 0 && (
        <ul className="mt-3 grid gap-x-6 gap-y-2 border-t border-rule pt-3 sm:grid-cols-2">
          {marks.map(({ ok, r }) => (
            <li key={r.statement.id} className="flex items-start gap-2.5 text-[0.875rem] leading-snug text-ink">
              {ok ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2.25} />
              ) : (
                <Close className="mt-0.5 h-4 w-4 shrink-0 text-disagree" strokeWidth={2.25} />
              )}
              <span>
                <span className="sr-only">{ok ? "You both say: " : ""}</span>
                {ok ? r.text : `They say: ${r.text}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {results("-mb-2 mt-1 sm:hidden")}
    </m.section>
  );
}

function toRoman(n: number): string {
  return ["", "i", "ii", "iii", "iv", "v", "vi", "vii"][n] ?? String(n);
}
