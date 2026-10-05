import type { Transition } from "framer-motion";

/** Shared-element morph between grid card and detail page. */
export const morph: Transition = { type: "spring", stiffness: 260, damping: 32, mass: 0.9 };

export const ease = [0.22, 1, 0.36, 1] as const;

export const portraitId = (slug: string) => `portrait-${slug}`;
export const nameId = (slug: string) => `name-${slug}`;
