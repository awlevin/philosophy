import { AnimatePresence, m } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { FilterBar } from "../components/FilterBar";
import { PhilosopherCard } from "../components/PhilosopherCard";
import { ThemeToggle } from "../components/ThemeToggle";
import { philosophers } from "../data/philosophers";
import { applyFilters, parseFilters, serializeFilters, type Filters } from "../lib/filters";

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
  const filters = useMemo(() => parseFilters(search), [search]);
  const list = useMemo(() => applyFilters(philosophers, filters), [filters]);

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

  return (
    <div inert={covered} aria-hidden={covered || undefined}>
      <header className="mx-auto max-w-[1400px] px-4 pt-10 pb-8 sm:px-8 sm:pt-16 sm:pb-12">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="eyebrow">A cheat sheet in sixty-one faces</p>
            <h1 className="mt-3 font-display text-[3.25rem] leading-[0.95] font-medium tracking-[-0.01em] text-ink sm:text-[5.5rem]">
              Philosophers
            </h1>
            <p className="mt-4 max-w-xl font-display text-[1.25rem] leading-snug text-ink-2 italic sm:text-[1.5rem]">
              From Thales to Foucault — who asked what, and the one thing to remember about each.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <FilterBar filters={filters} onChange={setFilters} shown={list.length} total={philosophers.length} />

      <main className="mx-auto max-w-[1400px] px-4 pt-8 pb-24 sm:px-8 sm:pt-10">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <AnimatePresence mode="popLayout" initial={false}>
            {list.map((p, i) => (
                <PhilosopherCard
                  key={p.slug}
                  p={p}
                  gridSearch={search}
                  eager={i < 2 && !search && !covered}
                  priority={i < 2 && !search && !covered}
                  deferImage={deferImages}
                  returning={returningSlug === p.slug}
                  onReturned={onReturned}
                />
            ))}
          </AnimatePresence>
        </ul>

        {list.length === 0 && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 text-center">
            <p className="font-display text-3xl text-ink-2 italic">No one fits all of that.</p>
            <button
              type="button"
              onClick={() => setFilters({ eras: [], traditions: [], questions: [], q: "", sort: filters.sort })}
              className="mt-4 text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              Clear filters
            </button>
          </m.div>
        )}
      </main>

      <footer className="mx-auto max-w-[1400px] border-t border-rule px-4 py-10 text-[0.78rem] leading-relaxed text-muted sm:px-8">
        Portraits from Wikimedia Commons, public domain or Creative Commons licensed; credits on each page.
        Facts are compressed for skimming — follow your curiosity to the sources.
      </footer>
    </div>
  );
}
