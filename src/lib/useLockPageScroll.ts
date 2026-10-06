import { useIsPresent } from "framer-motion";
import { useEffect } from "react";

/**
 * Locks the page behind a full-screen layer while it's open. Closing hands the page back at once
 * (the layer stays mounted to animate out), so the gallery scrolls during the exit, not after it.
 * Returns whether the layer is present (not exiting).
 */
export function useLockPageScroll(): boolean {
  const present = useIsPresent();
  useEffect(() => {
    if (!present) return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, [present]);
  return present;
}
