import { AnimatePresence, LayoutGroup, LazyMotion, MotionConfig } from "framer-motion";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { matchPath, useLocation } from "react-router";
import { Detail, type DetailState } from "./pages/Detail";
import { Home } from "./pages/Home";

const loadFeatures = () => import("./lib/motion-features").then((r) => r.default);

/**
 * The grid is always mounted; /p/:slug renders the detail page as a full-screen layer above it.
 * Keeping both in one LayoutGroup lets portrait + name morph card → page and back
 * (including on browser back), and the grid keeps its scroll position and filters.
 */
export function App() {
  const location = useLocation();
  const match = matchPath("/p/:slug", location.pathname);
  const slug = match?.params.slug ?? null;
  const state = (location.state ?? {}) as DetailState;
  const gridSearch = slug ? (state.gridSearch ?? "") : location.search;

  // When the detail closes, lift its card above the fading layer until it lands.
  const [returningSlug, setReturningSlug] = useState<string | null>(null);
  const lastSlug = useRef<string | null>(slug);
  // Opening a page mid-return drops the lift: the timer below is cancelled on that change, and the
  // interrupted flight never reports completion, so the card would stay above the new page.
  useLayoutEffect(() => {
    if (!slug && lastSlug.current) {
      setReturningSlug(lastSlug.current);
      const t = setTimeout(() => setReturningSlug(null), 1200);
      lastSlug.current = null;
      return () => clearTimeout(t);
    }
    if (slug) setReturningSlug(null);
    lastSlug.current = slug;
  }, [slug]);
  const onReturned = useCallback(() => setReturningSlug(null), []);

  return (
    <LazyMotion features={loadFeatures} strict>
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <Home search={gridSearch} covered={!!slug} returningSlug={returningSlug} onReturned={onReturned} />
        <AnimatePresence initial={false}>{slug && <Detail key="detail" slug={slug} />}</AnimatePresence>
      </LayoutGroup>
    </MotionConfig>
    </LazyMotion>
  );
}
