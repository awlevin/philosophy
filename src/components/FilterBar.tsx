import { AnimatePresence, m } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ERAS, ERA_RANGES, QUESTIONS, TRADITIONS } from "../data/philosophers";
import { activeCount, toggle, type Filters, type SortMode } from "../lib/filters";
import { ease } from "../lib/motion";
import { Close, Search, Sliders } from "./Icons";

type Props = {
  filters: Filters;
  onChange: (f: Filters) => void;
  shown: number;
  total: number;
};

export function FilterBar({ filters, onChange, shown, total }: Props) {
  const [open, setOpen] = useState(false);
  const desktop = useMedia("(min-width: 768px)");
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (desktop && !stuck) setOpen(false);
  }, [desktop, stuck]);
  // Desktop shows the chip groups inline under the bar; once the bar is pinned (or on mobile),
  // they drop down from it on demand instead, so the pinned bar stays one row tall.
  const showToggle = !desktop || stuck;
  const clear = () => onChange({ eras: [], traditions: [], questions: [], q: "", sort: filters.sort });
  const countLabel = shown === total ? `${total} philosophers` : `${shown} of ${total}`;
  const n = activeCount(filters);
  const dirty = n > 0 || filters.q !== "";
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  const groups = (
    <div className="flex flex-col gap-2.5 pt-3 pb-4">
      <ChipRow label="Era">
        {ERAS.map((e) => (
          <Chip key={e} active={filters.eras.includes(e)} title={ERA_RANGES[e]} onClick={() => set({ eras: toggle(filters.eras, e) })}>
            {e}
          </Chip>
        ))}
      </ChipRow>
      <ChipRow label="Tradition">
        {TRADITIONS.map((t) => (
          <Chip key={t} active={filters.traditions.includes(t)} onClick={() => set({ traditions: toggle(filters.traditions, t) })}>
            {t}
          </Chip>
        ))}
      </ChipRow>
      <ChipRow label="Big Question">
        {QUESTIONS.map((q) => (
          <Chip key={q} active={filters.questions.includes(q)} onClick={() => set({ questions: toggle(filters.questions, q) })}>
            {q}
          </Chip>
        ))}
      </ChipRow>
    </div>
  );

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px" />
      <div
        className={`sticky top-0 z-30 bg-paper/90 backdrop-blur-md transition-[border-color] supports-[backdrop-filter]:bg-paper/75 ${
          stuck ? "border-b border-rule" : "border-b border-rule md:border-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-4 py-3 sm:gap-3 sm:px-8">
          <label className="relative min-w-0 flex-1 sm:max-w-xs">
            <span className="sr-only">Search by name</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={filters.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Search by name"
              autoComplete="off"
              spellCheck={false}
              className="h-10 w-full rounded-full border border-rule bg-paper-2/60 pr-3 pl-9 text-[0.9rem] text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </label>

          <SortToggle value={filters.sort} onChange={(sort) => set({ sort })} />

          {(
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="filter-panel"
              aria-label={`Filters${n ? ` (${n} active)` : ""}`}
              className={`relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-[0.8rem] transition-colors max-md:w-10 max-md:justify-center max-md:px-0 ${stuck ? "" : "md:hidden"} ${
                open ? "border-ink text-ink" : "border-rule text-ink-2 hover:text-ink"
              }`}
            >
              <Sliders className="h-[18px] w-[18px]" />
              <span className="max-md:hidden">Filters</span>
              {n > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.65rem] font-semibold text-accent-ink max-md:absolute max-md:-top-1 max-md:-right-1">
                  {n}
                </span>
              )}
            </button>
          )}

          <div className="ml-auto hidden items-center gap-3 sm:flex">
            <span className="text-[0.78rem] text-muted tabular-nums" aria-live="polite">
              {countLabel}
            </span>
            {dirty && (
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.78rem] font-medium text-accent hover:bg-chip"
              >
                <Close className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showToggle && open && (
            <m.div
              key="panel"
              id="filter-panel"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease }}
              className="absolute inset-x-0 top-full max-h-[70vh] overflow-y-auto border-b border-rule bg-paper shadow-[var(--shadow)]"
            >
              <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
                {groups}
                <div className="flex items-center justify-between pb-4 text-[0.78rem] text-muted sm:hidden">
                  <span className="tabular-nums">{countLabel}</span>
                  {dirty && (
                    <button type="button" onClick={clear} className="font-medium text-accent">
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mx-auto hidden max-w-[1400px] border-b border-rule px-8 md:block" aria-label="Filters" role="region">
        {groups}
      </div>
    </>
  );
}

function useMedia(query: string) {
  // False until mounted, so prerendered HTML and first client render agree.
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatches(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return matches;
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex items-start gap-3">
      <span className="eyebrow w-[6.5rem] shrink-0 pt-[0.45rem] max-md:hidden">{label}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 md:block">
        <span className="eyebrow md:hidden">{label}</span>
        <div className="scroll-row -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:[mask-image:none]">
          {children}
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className={`h-[1.875rem] shrink-0 rounded-full border px-3 text-[0.8rem] whitespace-nowrap transition-colors duration-200 ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-transparent bg-chip text-ink-2 hover:border-rule hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function SortToggle({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  const opts: { v: SortMode; label: string; short: string }[] = [
    { v: "chrono", label: "Chronological", short: "Date" },
    { v: "alpha", label: "Alphabetical", short: "A–Z" },
  ];
  return (
    <div role="radiogroup" aria-label="Sort order" className="flex h-10 shrink-0 rounded-full border border-rule p-1">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`relative rounded-full px-3 text-[0.8rem] transition-colors ${value === o.v ? "text-paper" : "text-ink-2 hover:text-ink"}`}
        >
          {value === o.v && (
            <m.span
              layoutId="sort-pill"
              className="absolute inset-0 rounded-full bg-ink"
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            />
          )}
          <span className="relative">
            <span className="sm:hidden">{o.short}</span>
            <span className="max-sm:hidden">{o.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
