import { animate, useMotionValue, type MotionValue } from "framer-motion";
import { useEffect, useRef, type RefObject } from "react";

/** Past this far (px), or flicked faster than FLICK (px/ms), a release dismisses. */
const DISTANCE = 110;
const FLICK = 0.6;
const settle = { type: "spring", stiffness: 500, damping: 40 } as const;

/**
 * Pull down from the top of a scrolled page to dismiss it (touch only). Returns how far it's pulled,
 * for the page to follow the finger with. Only takes over when the page is scrolled to the top and
 * the drag starts downward and mostly vertical; otherwise the page scrolls (and sideways swipes
 * still reach their own handler).
 */
export function usePullToDismiss(
  ref: RefObject<HTMLElement | null>,
  { enabled, onDismiss }: { enabled: boolean; onDismiss: () => void },
): MotionValue<number> {
  const pull = useMotionValue(0);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    // Back from closing (another page opened before this one finished leaving): let go of the old pull.
    if (pull.get() !== 0) animate(pull, 0, settle);
    let startX = 0;
    let startY = 0;
    let lastY = 0;
    let lastT = 0;
    let speed = 0;
    let decided = false;
    let pulling = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = lastY = e.touches[0].clientY;
      lastT = e.timeStamp;
      decided = pulling = false;
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (!decided) {
        if (Math.hypot(dx, dy) < 6) return;
        decided = true;
        pulling = el.scrollTop <= 0 && dy > 0 && dy > Math.abs(dx);
      }
      if (!pulling) return;
      e.preventDefault();
      speed = (t.clientY - lastY) / Math.max(1, e.timeStamp - lastT);
      lastY = t.clientY;
      lastT = e.timeStamp;
      pull.set(Math.max(0, dy));
    };
    const onEnd = () => {
      if (!pulling) return;
      pulling = false;
      if (pull.get() > DISTANCE || speed > FLICK) dismiss.current();
      else animate(pull, 0, settle);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [ref, enabled, pull]);

  return pull;
}
