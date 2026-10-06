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

/** Seconds the peek sheet takes to grow to full screen before the page fades in over it. */
export const PEEK_HANDOFF = 0.32;

export const portraitId = (slug: string) => `portrait-${slug}`;
export const nameId = (slug: string) => `name-${slug}`;
