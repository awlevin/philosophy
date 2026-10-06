import type { MouseEvent } from "react";

/**
 * On touch screens a tap opens the peek sheet instead of the full page (the link stays a real
 * link for new tabs, keyboards and pointers that can hover). Callers skip this for a card that is
 * already peeking, so a second tap (or a double tap) opens the page.
 */
export function peekInstead(e: MouseEvent, peek: () => void) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (!window.matchMedia("(hover: none)").matches) return;
  e.preventDefault();
  peek();
}
