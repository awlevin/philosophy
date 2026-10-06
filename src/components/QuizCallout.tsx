import { Link } from "react-router";
import { bySlug } from "../data/philosophers";
import { listNames, shortName } from "../lib/format";
import { useRanking } from "../lib/quiz";
import type { QuizState } from "../pages/Quiz";
import { FacePile } from "./FacePile";
import { ArrowRight } from "./Icons";

const FACES = ["socrates", "kant", "beauvoir"].map((s) => bySlug.get(s)!);

/** The home page's one way into the quiz; once it's taken, a way back to the results. */
export function QuizCallout({ gridSearch }: { gridSearch: string }) {
  const ranking = useRanking();
  const top = ranking && ranking.list.length > 0 ? ranking.list.slice(0, 3).map((m) => m.p) : null;
  return (
    <Link
      to="/quiz"
      state={{ gridSearch } satisfies QuizState}
      className="group mt-5 flex w-full items-center gap-3 rounded-2xl bg-paper-2 py-3 pr-3.5 pl-3 text-left transition-colors hover:bg-chip sm:mt-7 sm:inline-flex sm:w-auto sm:min-w-[22rem] sm:gap-4 sm:py-3.5 sm:pr-4 sm:pl-4"
    >
      <FacePile people={top ?? FACES} faceClass="h-9 w-9 ring-2 ring-paper-2 sm:h-10 sm:w-10" />
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9rem] leading-snug font-medium text-balance text-ink sm:text-[0.95rem]">
          {top ? `Closest to you: ${listNames(top.map(shortName))}` : "Which of them think like you?"}
        </span>
        <span className="block text-[0.8rem] text-muted">{top ? "See your results" : "Takes ~ 3 minutes"}</span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}