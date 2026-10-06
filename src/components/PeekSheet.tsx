import { m } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { BigQuestion, Philosopher } from "../data/philosophers";
import { eraVars } from "../lib/era";
import { lifespan, shortName } from "../lib/format";
import { PEEK_HANDOFF, ease } from "../lib/motion";
import type { DetailState } from "../pages/Detail";
import { ArrowRight, Close } from "./Icons";
import { Thumb } from "./Portrait";

/**
 * A quick look from the gallery on touch screens: face, dates, and their take on each filtered
 * Big Question (or their first fact when no question is filtered). Swipe down to dismiss, up (or "Open") for
 * the full page; tapping another face swaps the sheet, for comparing takes.
 *
 * Opening grows the sheet up to fill the screen as the page fades in over it, rather than flying
 * the page out of the card hidden behind the sheet (the page knows, via `fromPeek`).
 */
export function PeekSheet({
  p,
  questions,
  gridSearch,
  onClose,
}: {
  p: Philosopher;
  /** Big Questions being filtered on: the sheet shows this philosopher's take on each. */
  questions: BigQuestion[];
  gridSearch: string;
  onClose: () => void;
}) {
  const takes = questions.flatMap((q) => (p.takes?.[q] ? [{ q, take: p.takes[q] }] : []));
  const navigate = useNavigate();
  // Set on "Open": the page's background color, which the sheet turns into as it grows.
  const [opening, setOpening] = useState<string | null>(null);
  const open = () => {
    setOpening(getComputedStyle(document.documentElement).getPropertyValue("--paper").trim());
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
          ? {
              // Grow to full screen and take on the page's color; the page then fades in over it.
              height: "100dvh",
              borderRadius: 0,
              backgroundColor: opening,
              // A real keyframe (not [1, 1], which ends at once) holds the sheet until the page is opaque.
              opacity: [1, 1, 0],
              transition: { duration: PEEK_HANDOFF, ease, opacity: { duration: PEEK_HANDOFF + 0.4, times: [0, 0.85, 1] } },
            }
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
      {/* On "Open" the contents clear first, leaving an empty sheet to grow into the page. */}
      <m.div exit={opening ? { opacity: 0, transition: { duration: 0.12 } } : undefined}>
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
        {takes.length > 0 ? (
          <dl className="mt-3.5 flex flex-col gap-3">
            {takes.map(({ q, take }) => (
              <div key={q}>
                <dt className="text-[0.8rem] font-semibold" style={{ color: "var(--era-ink)" }}>
                  {q}
                </dt>
                <dd className="mt-1 font-display text-[1.3rem] leading-snug text-pretty text-ink">{take}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3.5 font-display text-[1.3rem] leading-snug text-pretty text-ink">{p.facts[0]}</p>
        )}
        <button
          type="button"
          onClick={open}
          className="mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--era-ink)] text-[0.95rem] font-semibold text-paper"
        >
          Open {shortName(p)}
          <ArrowRight className="h-4 w-4" />
        </button>
      </m.div>
    </m.div>
  );
}
