import { m } from "framer-motion";
import type { Ref } from "react";
import { Link } from "react-router";
import type { Philosopher } from "../data/philosophers";
import { lifespan } from "../lib/format";
import { ease, morph, nameId } from "../lib/motion";
import { GRID_SIZES, Portrait } from "./Portrait";

type Props = {
  p: Philosopher;
  gridSearch: string;
  eager?: boolean;
  priority?: boolean;
  deferImage?: boolean;
  /** Raised above the closing detail overlay while it morphs back into place. */
  returning?: boolean;
  onReturned?: () => void;
  ref?: Ref<HTMLLIElement>;
};

export function PhilosopherCard({ p, gridSearch, eager, priority, deferImage, returning, onReturned, ref }: Props) {
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
        className="card group block rounded-[3px] outline-offset-4"
      >
        <div className="transition-transform duration-500 ease-out group-hover:-translate-y-1">
          <Portrait
            p={p}
            eager={eager}
            priority={priority}
            decorative
            defer={deferImage}
            sizes={GRID_SIZES}
            className="rounded-[3px] shadow-[var(--shadow)]"
          />
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
          <p className="mt-1 text-[0.72rem] tracking-[0.04em] text-muted tabular-nums">
            {p.aka && <span className="italic">{p.aka} · </span>}
            {lifespan(p)}
          </p>
        </div>
      </Link>
    </m.li>
  );
}
