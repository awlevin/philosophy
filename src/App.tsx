import { AnimatePresence, LayoutGroup, LazyMotion, MotionConfig } from "framer-motion";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { matchPath, useLocation } from "react-router";
import { Detail, type DetailState } from "./pages/Detail";
import { Home } from "./pages/Home";
import { Quiz, type QuizState } from "./pages/Quiz";

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
  const quiz = !!matchPath("/quiz", location.pathname);
  const state = (location.state ?? {}) as DetailState & QuizState;
  const gridSearch = slug || quiz ? (state.gridSearch ?? "") : location.search;

  // When the detail closes, lift its card above the fading layer until it lands.
  const [returningSlug, setReturningSlug] = useState<string | null>(null);
  const lastSlug = useRef<string | null>(slug);
  // Opening a page mid-return drops the lift: the timer below is cancelled on that change, and the
  // interrupted flight never reports completion, so the card would stay above the new page.
  useLayoutEffect(() => {
    if (!slug && lastSlug.current) {
      const from = lastSlug.current;
      lastSlug.current = null;
      // Back to the quiz (a page opened from its results): the card stays under it.
      if (quiz) return;
      setReturningSlug(from);
      const t = setTimeout(() => setReturningSlug(null), 1200);
      return () => clearTimeout(t);
    }
    if (slug) setReturningSlug(null);
    lastSlug.current = slug;
  }, [slug, quiz]);
  const onReturned = useCallback(() => setReturningSlug(null), []);

  return (
    <LazyMotion features={loadFeatures} strict>
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <Home search={gridSearch} covered={!!slug || quiz} returningSlug={returningSlug} onReturned={onReturned} />
        <AnimatePresence initial={false}>{slug && <Detail key="detail" slug={slug} />}</AnimatePresence>
        <AnimatePresence initial={false}>{quiz && <Quiz key="quiz" />}</AnimatePresence>
      </LayoutGroup>
    </MotionConfig>
    </LazyMotion>
  );
}
