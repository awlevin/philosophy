import type { MouseEvent } from "react";

/**
 * On touch screens a tap peeks instead of opening the full page (the link stays a real link for
 * new tabs, keyboards and pointers that can hover). Tapping the face that is peeking puts the peek
 * away; the page opens only from the sheet ("Open", or a swipe up).
 */
export function peekInstead(e: MouseEvent, peek: () => void) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (!window.matchMedia("(hover: none)").matches) return;
  e.preventDefault();
  peek();
}
