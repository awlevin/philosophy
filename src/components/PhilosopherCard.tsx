import { m } from "framer-motion";
import type { Ref } from "react";
import { Link } from "react-router";
import type { Philosopher } from "../data/philosophers";
import { lifespan, shortName } from "../lib/format";
import { ease, morph, nameId } from "../lib/motion";
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
  onPeek: (p: Philosopher) => void;
  /** Raised above the closing detail overlay while it morphs back into place. */
  returning?: boolean;
  onReturned?: () => void;
  ref?: Ref<HTMLLIElement>;
};

export function PhilosopherCard({ p, gridSearch, eager, priority, deferImage, peeking, onPeek, returning, onReturned, ref }: Props) {
  const short = shortName(p);
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
      style={{ position: "relative", zIndex: returning ? 60 : undefined }}
    >
      <Link
        to={`/p/${p.slug}`}
        state={{ gridSearch, fromGrid: true }}
        onClick={(e) => peekInstead(e, () => onPeek(p))}
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
          <p className="mt-1 text-[0.7rem] tracking-[0.04em] text-muted tabular-nums max-sm:hidden">
            {p.aka && <span className="italic">{p.aka} · </span>}
            {lifespan(p)}
          </p>
        </div>
      </Link>
    </m.li>
  );
}
