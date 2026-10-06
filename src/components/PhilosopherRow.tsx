import { m } from "framer-motion";
import type { Ref } from "react";
import { Link } from "react-router";
import type { Philosopher } from "../data/philosophers";
import { eraVars } from "../lib/era";
import { bornLabel, lifespan } from "../lib/format";
import { RETURNING_LAYER, ease, morph, nameId } from "../lib/motion";
import { peekInstead } from "../lib/peek";
import { Portrait } from "./Portrait";

type Props = {
  p: Philosopher;
  gridSearch: string;
  /** By time: a birth-year column and a line through the era. A–Z: an era tag instead. */
  timeline: boolean;
  deferImage?: boolean;
  peeking?: boolean;
  onPeek?: (p: Philosopher) => void;
  returning?: boolean;
  onReturned?: () => void;
  /** Quiz match (0–100), shown in place of dates in For-you order. */
  match?: number;
  ref?: Ref<HTMLLIElement>;
};

export function PhilosopherRow({ p, gridSearch, timeline, deferImage, peeking, onPeek, returning, onReturned, match, ref }: Props) {
  return (
    <m.li
      ref={ref}
      layout="position"
      data-slug={p.slug}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ layout: { duration: 0.45, ease }, opacity: { duration: 0.25 } }}
      onLayoutAnimationComplete={returning ? onReturned : undefined}
      style={{ position: "relative", zIndex: returning ? RETURNING_LAYER : undefined, ...eraVars(p.era) }}
    >
      <Link
        to={`/p/${p.slug}`}
        state={{ gridSearch, fromGrid: true }}
        onClick={(e) => onPeek && peekInstead(e, () => onPeek(p))}
        className={`flex h-16 items-center gap-3 rounded-xl pr-3 transition-colors ${
          // Not the section band's tint at full strength: a lighter fill with an outline, so a selected
          // first row reads as its own thing under the band.
          peeking ? "bg-[var(--era-tint)]/55 ring-1 ring-[var(--era)]/45 ring-inset" : "hover:bg-paper-2"
        } ${timeline ? "" : "pl-2"}`}
      >
        {timeline && (
          <>
            <span className="w-14 shrink-0 text-right text-[0.7rem] leading-tight text-muted tabular-nums">{bornLabel(p)}</span>
            <span aria-hidden className="relative flex w-3.5 shrink-0 items-center justify-center self-stretch">
              <span className="absolute inset-y-0 w-0.5 bg-[var(--era)] opacity-35" />
              <span className="relative h-2.5 w-2.5 rounded-full bg-[var(--era)] ring-[3px] ring-paper" />
            </span>
          </>
        )}
        <Portrait p={p} decorative defer={deferImage} sizes="44px" radius={22} className="w-11 shrink-0" />
        <span className="min-w-0 flex-1">
          <m.span
            layoutId={nameId(p.slug)}
            layoutCrossfade={false}
            transition={{ layout: morph }}
            className="block origin-top-left truncate font-display text-[1.22rem] leading-tight font-semibold text-ink"
          >
            {p.name}
          </m.span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-muted">
            {match != null && <span className="font-semibold text-accent tabular-nums">{match}% match · </span>}
            {p.tradition[0]}
            {match == null && ` · ${lifespan(p)}`}
          </span>
        </span>
        {!timeline && (
          <span className="shrink-0 rounded-full bg-[var(--era-tint)] px-2 py-0.5 text-[0.68rem] font-semibold text-[var(--era-ink)]">
            {p.era}
          </span>
        )}
      </Link>
    </m.li>
  );
}
