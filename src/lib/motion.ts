import { motionValue, type Transition } from "framer-motion";

/** Shared-element morph between grid card and detail page. */
export const morph: Transition = { type: "spring", stiffness: 260, damping: 32, mass: 0.9 };

export const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Stacking while a page closes: the page drops to EXITING_LAYER and its card rises to RETURNING_LAYER,
 * so the card flies home above the fading page but under the sticky bar (30) and section bands (10).
 */
export const EXITING_LAYER = 5;
export const RETURNING_LAYER = 6;

/** Where the peek sheet was when it opened into a page: insets from each viewport edge and corner radii, in px. */
export type SheetRect = { top: number; right: number; bottom: number; left: number; radii: [number, number, number, number] };

/**
 * A page sliding up out of the peek sheet. Underdamped enough to land rather than creep the last
 * few pixels (the slight overshoot is held at the top, so it never shows).
 */
export const grow: Transition = { type: "spring", stiffness: 150, damping: 19 };

/** How far a page has slid up out of the peek sheet, 0 to 1. The page sets it; the sheet follows it. */
export const peekSlide = motionValue(0);

/**
 * The handoff from the peek's text to the page's as the page slides up, as [start, end] fractions of
 * the slide: by slide position, not time, so a phone slow to start the slide can't put them out of step.
 */
export const HANDOFF: { peekOut: [number, number]; pageIn: [number, number] } = { peekOut: [0.1, 0.4], pageIn: [0.2, 0.7] };

/** 0 before `start`, 1 after `end`, straight in between (a step when they're equal). */
export const ramp = (x: number, [start, end]: [number, number]) =>
  end <= start ? (x >= start ? 1 : 0) : Math.min(1, Math.max(0, (x - start) / (end - start)));

export const portraitId = (slug: string) => `portrait-${slug}`;
export const nameId = (slug: string) => `name-${slug}`;
