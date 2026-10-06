import { storedChoice } from "./storedChoice";

/** Faces and List use the era palette; Classic is the original flat, sepia gallery. */
export type ViewMode = "faces" | "list" | "classic";

/** The gallery view. Classic is page-wide (gallery and detail pages), so it lives on <html>, like the theme. */
export const useViewMode = storedChoice<ViewMode>("view", ["faces", "list", "classic"], "faces", (v) => {
  if (v === "classic") document.documentElement.dataset.look = "classic";
  else delete document.documentElement.dataset.look;
});

/** On touch screens, when not filtering (which always peeks): a tap opens the page, or peeks first. */
export type TapMode = "open" | "peek";
export const useTapMode = storedChoice<TapMode>("tap", ["open", "peek"], "open");
