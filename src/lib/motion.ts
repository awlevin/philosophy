import type { Transition } from "framer-motion";

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
 * A page growing out of the peek sheet. Slightly underdamped, so its edges arrive crisply instead of
 * creeping the last few pixels (the overshoot lands off screen).
 */
export const grow: Transition = { type: "spring", stiffness: 120, damping: 19 };

/** Seconds into a page's growth out of the peek sheet before its contents start to come in. */
export const PEEK_LEAD = 0.06;

export const portraitId = (slug: string) => `portrait-${slug}`;
export const nameId = (slug: string) => `name-${slug}`;
