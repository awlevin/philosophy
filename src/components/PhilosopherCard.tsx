import { m } from "framer-motion";
import type { ReactNode, Ref } from "react";
import { Link } from "react-router";
import type { Philosopher } from "../data/philosophers";
import { lifespan, shortName } from "../lib/format";
import { RETURNING_LAYER, ease, morph, nameId } from "../lib/motion";
import { peekInstead } from "../lib/peek";
import { GRID_SIZES, Portrait } from "./Portrait";

type Props = {
  p: Philosopher;
  gridSearch: string;
  eager?: boolean;
  priority?: boolean;
  deferImage?: boolean;
  /** Its peek sheet is open. */
  peeking?: boolean;
  /** Omitted in Classic, where a tap goes straight to the page. */
  onPeek?: (p: Philosopher) => void;
  /** The original look: larger cards, full names and dates at every size, no peek. */
  classic?: boolean;
  /** Raised above the closing detail overlay while it morphs back into place. */
  returning?: boolean;
  onReturned?: () => void;
  /** Quiz match (0–100), shown in place of dates in For-you order. */
  match?: number;
  ref?: Ref<HTMLLIElement>;
};

export function PhilosopherCard({ p, gridSearch, eager, priority, deferImage, peeking, onPeek, classic, returning, onReturned, match, ref }: Props) {
  const short = shortName(p);
  const sub =
    match != null ? (
      <span className="font-semibold text-accent">{match}% match</span>
    ) : (
      <>
        {p.aka && <span className="italic">{p.aka} · </span>}
        {lifespan(p)}
      </>
    );
  if (classic) {
    return (
      <Shell p={p} returning={returning} onReturned={onReturned} ref={ref}>
        <Link to={`/p/${p.slug}`} state={{ gridSearch, fromGrid: true }} className="card group block rounded-[3px] outline-offset-4">
          <div className="transition-transform duration-500 ease-out group-hover:-translate-y-1">
            <Portrait p={p} eager={eager} priority={priority} decorative defer={deferImage} sizes={CLASSIC_SIZES} radius={3} className="shadow-[var(--shadow)]" />
          </div>
          <div className="pt-3 pr-1">
            <m.h2
              layoutId={nameId(p.slug)}
              layoutCrossfade={false}
              transition={{ layout: morph }}
              className="origin-top-left font-display text-[1.125rem] leading-[1.15] font-semibold text-ink sm:text-[1.2rem]"
            >
              {p.name}
            </m.h2>
            <p className="mt-1 text-[0.72rem] tracking-[0.04em] text-muted tabular-nums">{sub}</p>
          </div>
        </Link>
      </Shell>
    );
  }
  return (
    <Shell p={p} returning={returning} onReturned={onReturned} ref={ref}>
      <Link
        to={`/p/${p.slug}`}
        state={{ gridSearch, fromGrid: true }}
        onClick={(e) => onPeek && !peeking && peekInstead(e, () => onPeek(p))}
        className="group block rounded-[10px] outline-offset-4"
      >
        <div className="transition-transform duration-500 ease-out sm:group-hover:-translate-y-1">
          <Portrait
            p={p}
            eager={eager}
            priority={priority}
            decorative
            defer={deferImage}
            sizes={GRID_SIZES}
            radius={10}
            className={`shadow-[var(--shadow)] transition-shadow ${peeking ? "ring-[2.5px] ring-[var(--era)] ring-offset-2 ring-offset-paper" : ""}`}
          />
        </div>
        <div className="pt-1.5 text-center sm:pt-3 sm:pr-1 sm:text-left">
          {/* Phones show the short name; morph only when it reads the same as the detail page's title. */}
          <m.h2
            layoutId={short === p.name ? nameId(p.slug) : undefined}
            layoutCrossfade={false}
            transition={{ layout: morph }}
            className={`origin-top-left leading-tight font-semibold text-ink max-sm:truncate sm:font-display sm:text-[1.08rem] sm:leading-[1.15] ${
              short.length > 11 ? "text-[0.64rem]" : "text-[0.72rem]"
            }`}
          >
            <span className="sm:hidden">{short}</span>
            <span className="max-sm:hidden">{p.name}</span>
          </m.h2>
          <p className="mt-1 text-[0.7rem] tracking-[0.04em] text-muted tabular-nums max-sm:hidden">{sub}</p>
          {/* Phones show names only, but in For-you order the match is the point. */}
          {match != null && <p className="text-[0.62rem] font-semibold text-accent tabular-nums sm:hidden">{match}%</p>}
        </div>
      </Link>
    </Shell>
  );
}

const CLASSIC_SIZES =
  "(min-width: 1280px) 15vw, (min-width: 1024px) 18vw, (min-width: 768px) 23vw, (min-width: 640px) 31vw, 46vw";

/** The grid cell: enters, leaves and reflows with the list; lifted while its page morphs back. */
function Shell({
  p,
  returning,
  onReturned,
  ref,
  children,
}: Pick<Props, "p" | "returning" | "onReturned" | "ref"> & { children: ReactNode }) {
  return (
    <m.li
      ref={ref}
      layout="position"
      data-slug={p.slug}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ layout: { duration: 0.45, ease }, opacity: { duration: 0.3 }, scale: { duration: 0.35, ease } }}
      onLayoutAnimationComplete={returning ? onReturned : undefined}
      style={{ position: "relative", zIndex: returning ? RETURNING_LAYER : undefined }}
    >
      {children}
    </m.li>
  );
}
