import { AnimatePresence, m } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { FilterBar } from "../components/FilterBar";
import { Gallery } from "../components/Gallery";
import { ArrowLeft, ArrowRight } from "../components/Icons";
import { PeekSheet } from "../components/PeekSheet";
import { Thumb } from "../components/Portrait";
import { ThemeToggle } from "../components/ThemeToggle";
import { bySlug, philosophers, type Philosopher } from "../data/philosophers";
import { EMPTY_FILTERS, applyFilters, parseFilters, serializeFilters, type Filters } from "../lib/filters";
import { ease } from "../lib/motion";
import { toSections } from "../lib/sections";
import { useViewMode } from "../lib/view";
import type { GalleryState } from "./Detail";

type Props = {
  /** Query string that drives the grid (the live URL on "/", the remembered one under a detail page). */
  search: string;
  /** True while a detail page covers the grid. */
  covered: boolean;
  returningSlug: string | null;
  onReturned: () => void;
};

export function Home({ search, covered, returningSlug, onReturned }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const filters = useMemo(() => parseFilters(search), [search]);
  const list = useMemo(() => applyFilters(philosophers, filters), [filters]);
  const hidden = useMemo(() => philosophers.filter((p) => !list.includes(p)), [list]);
  const sections = useMemo(() => toSections(list, filters.sort), [list, filters.sort]);
  const [view, setView] = useViewMode();

  const [peek, setPeek] = useState<string | null>(null);
  const closePeek = useCallback(() => setPeek(null), []);
  const peeked = peek && list.some((p) => p.slug === peek) ? bySlug.get(peek) : undefined;
  useEffect(() => {
    if (covered) setPeek(null);
  }, [covered]);

  // Reached by tapping a chip on a detail page. Changing filters here replaces the entry without
  // this state, so "Back to …" goes away once the view is no longer the one that chip produced.
  const arrival = covered ? {} : ((location.state ?? {}) as GalleryState);
  const cameFrom = arrival.fromDetail ? bySlug.get(arrival.fromDetail) : undefined;

  // The filtered grid can put the returning card somewhere else entirely; bring it on screen so the
  // portrait has a visible place to land: from the top of the results if it fits, else centered.
  // Layout positions, not the in-flight transformed ones.
  useLayoutEffect(() => {
    if (!returningSlug) return;
    const card = document.querySelector<HTMLElement>(`[data-slug="${returningSlug}"]`);
    const grid = document.getElementById("grid");
    if (!card || !grid) return;
    const bar = document.querySelector<HTMLElement>("[data-filter-bar]")?.offsetHeight ?? 0;
    const cardTop = pageTop(card);
    const cardBottom = cardTop + card.offsetHeight;
    const fits = (scroll: number) => cardTop >= scroll + bar && cardBottom <= scroll + window.innerHeight;
    if (fits(window.scrollY)) return;
    const resultsTop = pageTop(grid) - bar;
    const target = fits(resultsTop) ? resultsTop : cardTop - (window.innerHeight + bar - card.offsetHeight) / 2;
    window.scrollTo({ top: target, behavior: "instant" });
  }, [returningSlug]);

  // Landing directly on a detail page: the grid underneath is hidden, so don't let its images
  // compete with the detail portrait. Load them shortly after, so closing still morphs to a face.
  const [deferImages, setDeferImages] = useState(covered);
  useEffect(() => {
    if (!deferImages) return;
    if (!covered) return setDeferImages(false);
    const t = setTimeout(() => setDeferImages(false), 2500);
    return () => clearTimeout(t);
  }, [covered, deferImages]);

  const setFilters = (f: Filters) => navigate({ pathname: "/", search: serializeFilters(f) }, { replace: true });
  const clearFilters = () => setFilters({ ...EMPTY_FILTERS, sort: filters.sort });

  return (
    <div inert={covered} aria-hidden={covered || undefined}>
      <header className="mx-auto max-w-[1400px] px-4 pt-8 pb-3 sm:px-8 sm:pt-16 sm:pb-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="eyebrow">A cheat sheet in sixty-one faces</p>
            <h1 className="mt-2 font-display text-[2.875rem] leading-[0.95] font-semibold tracking-[-0.01em] text-ink sm:mt-3 sm:text-[5.5rem]">
              Philosophers
            </h1>
            <p className="mt-4 max-w-xl font-display text-[1.5rem] leading-snug text-ink-2 italic max-sm:hidden">
              From Thales to Foucault — who asked what, and the one thing to remember about each.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        view={view}
        onView={setView}
        shown={list.length}
        total={philosophers.length}
        arrivedKey={arrival.chip}
        raised={!!cameFrom && returningSlug === cameFrom.slug}
      />

      <main
        id="grid"
        className={`mx-auto px-4 pb-24 sm:px-8 ${view === "list" ? "max-w-3xl pt-3" : view === "classic" ? "max-w-[1400px] pt-8 sm:pt-10" : "max-w-[1400px]"}`}
      >
        <Gallery
          sections={sections}
          view={view}
          timeline={filters.sort === "chrono"}
          gridSearch={search}
          eagerFirst={!search && !covered}
          deferImages={deferImages}
          peeking={peeked ? peeked.slug : null}
          onPeek={view === "classic" ? undefined : (p) => setPeek(p.slug)}
          returningSlug={returningSlug}
          onReturned={onReturned}
        />

        {list.length > 0 && hidden.length > 0 && (
          <HiddenRow hidden={hidden} onShowAll={clearFilters} />
        )}

        {list.length === 0 && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center">
            <p className="font-display text-3xl text-ink-2 italic">No one fits all of that.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              Clear filters
            </button>
          </m.div>
        )}
      </main>

      <AnimatePresence>
        {peeked && <PeekSheet key="peek" p={peeked} gridSearch={search} onClose={closePeek} />}
      </AnimatePresence>

      <AnimatePresence>
        {cameFrom && !peeked && (
          <m.button
            key="back"
            type="button"
            onClick={() => navigate(-1)}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.6, duration: 0.45, ease } }}
            exit={{ opacity: 0, y: 24, transition: { duration: 0.2 } }}
            className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-40 inline-flex h-12 max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-ink py-1.5 pr-5 pl-1.5 text-[0.9rem] font-medium text-paper shadow-[0_16px_36px_-10px_rgb(0_0_0/0.5)]"
          >
            <Thumb p={cameFrom} className="h-9 w-9 shrink-0 rounded-full" />
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">Back to {cameFrom.name}</span>
          </m.button>
        )}
      </AnimatePresence>

      <footer
        className={`mx-auto max-w-[1400px] border-t border-rule px-4 pt-10 text-[0.78rem] leading-relaxed text-muted sm:px-8 ${cameFrom ? "pb-28" : "pb-10"}`}
      >
        Portraits from Wikimedia Commons, public domain or Creative Commons licensed; credits on each page.
        Facts are compressed for skimming — follow your curiosity to the sources.
      </footer>
    </div>
  );
}

/** Document-relative top of an element, ignoring transforms (unlike getBoundingClientRect). */
function pageTop(el: HTMLElement): number {
  let top = 0;
  for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) top += e.offsetTop;
  return top;
}

/** Closes a filtered grid: what the filters are hiding, and the way out. */
function HiddenRow({ hidden, onShowAll }: { hidden: Philosopher[]; onShowAll: () => void }) {
  // A few faces spread across the hidden range, so the pile hints at its variety.
  const faces = [0, 1, 2, 3].map((k) => hidden[Math.floor((k * hidden.length) / 4)]).filter((p, k, a) => a.indexOf(p) === k);
  return (
    <m.button
      type="button"
      onClick={onShowAll}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.3, duration: 0.4 } }}
      className="group mt-12 flex w-full items-center gap-4 rounded-2xl bg-paper-2 py-3.5 pr-4 pl-4 text-left transition-colors hover:bg-chip sm:mx-auto sm:max-w-md"
    >
      <span className="flex shrink-0">
        {faces.map((p) => (
          <Thumb key={p.slug} p={p} className="-mr-3 h-10 w-10 rounded-full ring-2 ring-paper-2" />
        ))}
      </span>
      <span className="ml-3 min-w-0 flex-1">
        <span className="block text-[0.95rem] font-medium text-ink">{hidden.length} others hidden</span>
        <span className="block text-[0.8rem] text-muted">Clear filters to see all {philosophers.length}</span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </m.button>
  );
}
