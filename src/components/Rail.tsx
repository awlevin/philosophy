import type { PointerEvent } from "react";
import { eraVars } from "../lib/era";
import type { Section } from "../lib/sections";

/**
 * Jump strip on the right edge: era bars sized by how many each holds (by time), or letters (A–Z).
 * Tap a mark or drag along the strip to scrub.
 */
export function Rail({ sections, timeline }: { sections: Section[]; timeline: boolean }) {
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ block: "start" });
  const scrub = (e: PointerEvent) => {
    const mark = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-rail]");
    if (mark?.dataset.rail) jump(mark.dataset.rail);
  };
  return (
    <nav
      aria-label="Jump to section"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        scrub(e);
      }}
      onPointerMove={(e) => e.buttons && scrub(e)}
      className="fixed top-1/2 right-1 z-[35] flex w-7 -translate-y-1/2 touch-none flex-col items-center gap-[3px] rounded-[14px] bg-paper/90 py-2 shadow-[var(--shadow)] backdrop-blur select-none sm:right-3"
    >
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          data-rail={s.id}
          aria-label={`Jump to ${s.title}`}
          onClick={(e) => {
            e.preventDefault();
            jump(s.id);
          }}
          style={{ height: timeline ? s.items.length * 5 + 8 : 16, ...(s.era && eraVars(s.era)) }}
          className="flex w-7 items-center justify-center text-[0.62rem] font-semibold text-ink-2"
        >
          {timeline ? <span className="h-full w-1.5 rounded-full bg-[var(--era)]" /> : s.title}
        </a>
      ))}
    </nav>
  );
}
