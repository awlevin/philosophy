import { AnimatePresence, m } from "framer-motion";
import type { Philosopher } from "../data/philosophers";
import { eraVars } from "../lib/era";
import type { Section } from "../lib/sections";
import type { ViewMode } from "../lib/view";
import { PhilosopherCard } from "./PhilosopherCard";
import { PhilosopherRow } from "./PhilosopherRow";

type Props = {
  sections: Section[];
  view: ViewMode;
  /** Sections are eras (by time) rather than letters (A–Z). */
  timeline: boolean;
  gridSearch: string;
  /** Load the first faces eagerly (the likely largest paint). */
  eagerFirst: boolean;
  deferImages: boolean;
  peeking: string | null;
  /** Absent in Classic: a tap opens the page. */
  onPeek?: (p: Philosopher) => void;
  returningSlug: string | null;
  onReturned: () => void;
};

export function Gallery({ sections, view, timeline, gridSearch, eagerFirst, deferImages, peeking, onPeek, returningSlug, onReturned }: Props) {
  const item = (p: Philosopher, i: number) => ({
    p,
    gridSearch,
    deferImage: deferImages,
    peeking: peeking === p.slug,
    onPeek,
    returning: returningSlug === p.slug,
    onReturned,
    eager: eagerFirst && i < 8,
    priority: eagerFirst && i < 4,
  });
  let index = 0;

  if (view === "classic") {
    return (
      <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        <AnimatePresence mode="popLayout" initial={false}>
          {sections
            .flatMap((s) => s.items)
            .map((p, i) => (
              <PhilosopherCard key={p.slug} {...item(p, i)} classic eager={eagerFirst && i < 2} priority={eagerFirst && i < 2} />
            ))}
        </AnimatePresence>
      </ul>
    );
  }

  return (
    <AnimatePresence initial={false}>
      {sections.map((s) => (
        <m.section
          key={s.id}
          id={s.id}
          layout="position"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          aria-label={s.title}
          style={s.era && eraVars(s.era)}
          className="scroll-mt-[calc(var(--bar-h,4.5rem)+0.5rem)]"
        >
          {view === "faces" ? (
            <>
              <SectionHeading s={s} />
              <ul className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-5 sm:gap-x-5 sm:gap-y-8 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
                <AnimatePresence mode="popLayout" initial={false}>
                  {s.items.map((p) => (
                    <PhilosopherCard key={p.slug} {...item(p, index++)} />
                  ))}
                </AnimatePresence>
              </ul>
            </>
          ) : (
            <>
              <div className="sticky top-[var(--bar-h,4.5rem)] z-10 -mx-4 flex h-11 items-center gap-2.5 bg-[var(--era-tint,var(--paper-2))] px-4 sm:mx-0 sm:rounded-lg">
                {s.era && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--era)]" />}
                <h2 className="font-display text-[1.4rem] font-semibold text-ink">{s.title}</h2>
                {s.range && <span className="text-[0.75rem] font-medium text-[var(--era-ink)]">{s.range}</span>}
                <span className="ml-auto text-[0.75rem] font-semibold text-[var(--era-ink,var(--ink-2))] tabular-nums">{s.items.length}</span>
              </div>
              <ol>
                <AnimatePresence mode="popLayout" initial={false}>
                  {s.items.map((p) => (
                    <PhilosopherRow key={p.slug} timeline={timeline} {...item(p, index++)} />
                  ))}
                </AnimatePresence>
              </ol>
            </>
          )}
        </m.section>
      ))}
    </AnimatePresence>
  );
}

function SectionHeading({ s }: { s: Section }) {
  return (
    <div className="flex items-baseline gap-2.5 pt-7 pb-3 sm:pt-10 sm:pb-5">
      <h2 className="font-display text-[1.75rem] leading-none font-bold text-[var(--era-ink,var(--ink))] sm:text-[2.25rem]">{s.title}</h2>
      {s.range && <span className="text-[0.75rem] text-muted sm:text-[0.8rem]">{s.range}</span>}
      <span className="ml-auto text-[0.75rem] font-semibold text-[var(--era-ink,var(--ink-2))] tabular-nums">{s.items.length}</span>
    </div>
  );
}
