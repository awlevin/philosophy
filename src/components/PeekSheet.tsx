import { m } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { BigQuestion, Philosopher } from "../data/philosophers";
import { eraVars } from "../lib/era";
import { homeland, lifespan, shortName } from "../lib/format";
import { grow, type SheetRect } from "../lib/motion";
import type { DetailState } from "../pages/Detail";
import { ArrowRight, Close } from "./Icons";
import { Thumb } from "./Portrait";

/**
 * A quick look from the gallery on touch screens: face, dates, and their take on each filtered
 * Big Question (or their first fact when no question is filtered). Swipe down to dismiss, up (or "Open") for
 * the full page; tapping another face swaps the sheet, for comparing takes.
 *
 * Opening hands the sheet's place on screen to the page (via `fromPeek`), which grows out of it to
 * fill the screen. Meanwhile the sheet's own contents ride up with its top edge and fade away.
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
  const sheet = useRef<HTMLDivElement>(null);
  // Set on "Open": where the sheet is, for the page to grow out of.
  const [opening, setOpening] = useState<SheetRect | null>(null);
  const open = () => {
    if (!sheet.current) return;
    const r = sheet.current.getBoundingClientRect();
    const cs = getComputedStyle(sheet.current);
    const px = (v: string) => parseFloat(v) || 0;
    const rect: SheetRect = {
      top: r.top,
      right: innerWidth - r.right,
      // Flush with the bottom on phones, even while pulled up (the fill below the sheet covers the gap).
      bottom: px(cs.bottom) === 0 ? 0 : innerHeight - r.bottom,
      left: r.left,
      radii: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px) as SheetRect["radii"],
    };
    setOpening(rect);
    // One frame for the exit to pick up `opening` before the sheet unmounts.
    requestAnimationFrame(() =>
      navigate(`/p/${p.slug}`, { state: { gridSearch, fromGrid: true, fromPeek: rect } satisfies DetailState }),
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <m.div
      ref={sheet}
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
          ? // Stays for its contents to leave; the page has taken its place underneath.
            { opacity: [1, 1, 0], transition: { duration: 0.5, times: [0, 0.9, 1] } }
          : { y: "120%", transition: { duration: 0.22, ease: "easeIn" } }
      }
      transition={{ type: "spring", stiffness: 420, damping: 38 }}
      // Above the opening page, whose growing surface starts out identical to this one.
      style={{ ...eraVars(p.era), ...(opening && { zIndex: 60, pointerEvents: "none" }) }}
      // Phones: flush with the bottom edge and padded past the home indicator, so nothing shows
      // underneath as Safari's toolbar slides. Larger screens: a floating card.
      className="fixed inset-x-0 bottom-0 z-40 mx-auto touch-none rounded-t-[22px] px-4 pt-2.5 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:inset-x-2 sm:bottom-4 sm:max-w-[420px] sm:rounded-[22px] sm:pb-4"
    >
      <m.div
        aria-hidden
        exit={opening ? { opacity: 0, transition: { duration: 0.16, ease: "easeOut" } } : undefined}
        className="absolute inset-0 rounded-[inherit] bg-[var(--sheet)] shadow-[var(--shadow-lift)]"
      >
        {/* Fills in below when the sheet is pulled up past its resting place. */}
        <span className="absolute inset-x-0 top-full h-[50vh] bg-[var(--sheet)] sm:hidden" />
      </m.div>
      {/* On "Open" the contents ride up with the growing page's top edge as they fade. */}
      <m.div
        className="relative"
        exit={
          opening
            ? { y: -opening.top, opacity: 0, transition: { y: grow, opacity: { duration: 0.2, ease: "easeOut" } } }
            : undefined
        }
      >
        <div aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-full bg-rule" />
        <div className="flex items-center gap-3.5">
          <Thumb p={p} sizes="144px" className="h-[72px] w-[72px] shrink-0 rounded-[14px]" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow" style={{ color: "var(--era-ink)" }}>
              {p.era} · {p.tradition[0]}
            </p>
            <p className="mt-1 font-display text-[1.9rem] leading-none font-semibold text-balance text-ink">{p.name}</p>
            <p className="mt-1.5 text-[0.8rem] text-muted tabular-nums">
              {lifespan(p)} · {homeland(p)}
            </p>
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
