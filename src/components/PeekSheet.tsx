import { m } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Philosopher } from "../data/philosophers";
import { eraVars } from "../lib/era";
import { lifespan, shortName } from "../lib/format";
import { ease } from "../lib/motion";
import type { DetailState } from "../pages/Detail";
import { ArrowRight, Close } from "./Icons";
import { Thumb } from "./Portrait";

/**
 * A quick look from the gallery on touch screens: face, dates, one fact. Swipe down to dismiss,
 * up (or "Open") for the full page.
 *
 * Opening grows the sheet up to fill the screen as the page fades in over it, rather than flying
 * the page out of the card hidden behind the sheet (the page knows, via `fromPeek`).
 */
export function PeekSheet({ p, gridSearch, onClose }: { p: Philosopher; gridSearch: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const open = () => {
    setOpening(true);
    // One frame for the exit to pick up `opening` before the sheet unmounts.
    requestAnimationFrame(() =>
      navigate(`/p/${p.slug}`, { state: { gridSearch, fromGrid: true, fromPeek: true } satisfies DetailState }),
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <m.div
      role="dialog"
      aria-label={`${p.name}, preview`}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.08, bottom: 0.5 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 70 || info.velocity.y > 500) onClose();
        else if (info.offset.y < -50 || info.velocity.y < -500) open();
      }}
      initial={{ y: "120%" }}
      animate={{ y: 0 }}
      exit={
        opening
          ? { height: "100dvh", borderRadius: 0, opacity: [1, 1, 0], transition: { duration: 0.36, ease, opacity: { times: [0, 0.55, 1], duration: 0.36 } } }
          : { y: "120%", transition: { duration: 0.22, ease: "easeIn" } }
      }
      transition={{ type: "spring", stiffness: 420, damping: 38 }}
      style={eraVars(p.era)}
      // Phones: flush with the bottom edge and padded past the home indicator, so nothing shows
      // underneath as Safari's toolbar slides. Larger screens: a floating card.
      className="fixed inset-x-0 bottom-0 z-40 mx-auto touch-none rounded-t-[22px] bg-[var(--sheet)] px-4 pt-2.5 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-lift)] sm:inset-x-2 sm:bottom-4 sm:max-w-[420px] sm:rounded-[22px] sm:pb-4"
    >
      {/* Fills in below when the sheet is pulled up past its resting place. */}
      <span aria-hidden className="absolute inset-x-0 top-full h-[50vh] bg-[var(--sheet)] sm:hidden" />
      <div aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-full bg-rule" />
      <div className="flex items-center gap-3.5">
        <Thumb p={p} sizes="144px" className="h-[72px] w-[72px] shrink-0 rounded-[14px]" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow" style={{ color: "var(--era-ink)" }}>
            {p.era} · {p.tradition[0]}
          </p>
          <p className="mt-1 font-display text-[1.9rem] leading-none font-semibold text-balance text-ink">{p.name}</p>
          <p className="mt-1.5 text-[0.8rem] text-muted tabular-nums">{lifespan(p)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          // Quiet: a swipe down closes it too. Still a full 44px target.
          className="-mt-2 -mr-2.5 grid h-11 w-11 shrink-0 place-items-center self-start rounded-full text-muted transition-colors hover:text-ink"
        >
          <Close className="h-[15px] w-[15px]" />
        </button>
      </div>
      <p className="mt-3.5 font-display text-[1.3rem] leading-snug text-pretty text-ink">{p.facts[0]}</p>
      <button
        type="button"
        onClick={open}
        className="mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--era-ink)] text-[0.95rem] font-semibold text-paper"
      >
        Open {shortName(p)}
        <ArrowRight className="h-4 w-4" />
      </button>
    </m.div>
  );
}
