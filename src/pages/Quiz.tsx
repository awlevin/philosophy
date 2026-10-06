import { m } from "framer-motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { FacePile } from "../components/FacePile";
import { ArrowLeft, ArrowRight, Check, Close } from "../components/Icons";
import { Thumb } from "../components/Portrait";
import { ThemeToggle } from "../components/ThemeToggle";
import { bySlug, philosophers, type Philosopher } from "../data/philosophers";
import { STATEMENTS, type Statement } from "../data/quiz";
import { lifespan, listNames, shortName } from "../lib/format";
import { ease } from "../lib/motion";
import { useLockPageScroll } from "../lib/useLockPageScroll";
import { camps, useRanking, useSavedQuiz, type Answer, type Match, type Ranking, type Reason } from "../lib/quiz";
import type { DetailState } from "./Detail";

/** History state of /quiz: the gallery underneath, as on a detail page. */
export type QuizState = { gridSearch?: string };

/** Answers so far (undefined = not reached yet, null = skipped). */
type Run = { i: number; answers: (Answer | undefined)[]; revealed: boolean };

const N = STATEMENTS.length;
const INTRO_FACES = ["socrates", "laozi", "avicenna", "wollstonecraft", "nietzsche", "arendt"].map((s) => bySlug.get(s)!);

const primary =
  "inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-ink px-7 text-[0.95rem] font-medium text-paper transition-opacity hover:opacity-90";
const secondary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-rule px-6 text-[0.9rem] font-medium text-ink transition-colors hover:border-ink";

/**
 * /quiz: react to a handful of big ideas, then see the philosophers closest to you and furthest away.
 * Like a detail page, it covers the gallery, which stays mounted (and filtered) underneath.
 */
export function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as QuizState;
  const [, save] = useSavedQuiz();
  const ranking = useRanking();
  const [run, setRun] = useState<Run | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const close = () => (state.gridSearch !== undefined ? navigate(-1) : navigate("/"));
  const start = () => setRun({ i: 0, answers: [], revealed: false });
  const finish = (answers: (Answer | undefined)[]) => {
    save({ answers: STATEMENTS.map((_, k) => answers[k] ?? null) });
    setRun(null);
  };

  const present = useLockPageScroll();

  useEffect(() => {
    document.title = "Who thinks like you? — Philosophers";
    return () => {
      document.title = "Philosophers Quick Reference";
    };
  }, []);

  // Each statement, and each screen, starts at the top.
  const screen = run ? `q${run.i}` : ranking ? "results" : "intro";
  useLayoutEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [screen]);

  return (
    <m.div
      className="fixed inset-0 z-50 bg-paper"
      role="dialog"
      aria-modal="true"
      aria-label="Who thinks like you?"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.25 }}
      style={present ? undefined : { pointerEvents: "none" }}
    >
      <div ref={scroller} data-quiz-scroller className="h-full overflow-x-hidden overflow-y-auto overscroll-contain">
        {run ? (
          <Questions run={run} setRun={setRun} onFinish={finish} onLeave={close} />
        ) : ranking ? (
          <Results ranking={ranking} gridSearch={state.gridSearch ?? ""} onClose={close} onRetake={start} onClear={() => save(null)} />
        ) : (
          <Intro onStart={start} onClose={close} />
        )}
      </div>
    </m.div>
  );
}

function QuizNav({ left, center, right }: { left: ReactNode; center?: ReactNode; right?: ReactNode }) {
  return (
    <nav className="sticky top-0 z-10 -mx-4 flex h-12 items-center justify-between gap-3 bg-paper/90 px-4 backdrop-blur-md tall:h-16 sm:-mx-8 sm:px-8 sm:tall:h-20">
      <div className="flex min-w-0 flex-1 items-center">{left}</div>
      {center}
      <div className="flex flex-1 items-center justify-end gap-1">
        {right}
        <ThemeToggle />
      </div>
    </nav>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 inline-flex items-center gap-2 rounded-full px-2 py-2 text-[0.85rem] font-medium text-ink-2 hover:text-ink"
    >
      <ArrowLeft className="h-[18px] w-[18px]" />
      {children}
    </button>
  );
}

// ---------- Intro ----------

function Intro({ onStart, onClose }: { onStart: () => void; onClose: () => void }) {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-4 sm:px-8">
      <QuizNav left={<BackButton onClick={onClose}>All philosophers</BackButton>} />
      <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }} className="flex-1 pt-2 tall:pt-4 sm:tall:pt-10">
        <FacePile people={INTRO_FACES} faceClass="h-12 w-12 ring-[3px] ring-paper tall:h-14 tall:w-14" />
        <p className="eyebrow mt-6 tall:mt-8">Quiz · {N} statements</p>
        <h1 className="mt-2.5 font-display text-[2.5rem] leading-[0.98] font-semibold tracking-[-0.01em] text-ink tall:mt-3 tall:text-[3rem] sm:text-[4rem]">
          Who thinks like you?
        </h1>
        <p className="mt-3 font-display text-[1.2rem] leading-snug text-ink-2 italic tall:mt-4 tall:text-[1.35rem]">
          React to {N} big ideas. We’ll rank all {philosophers.length} philosophers by how often they’d side with you.
        </p>
        <ol className="mt-5 border-t border-rule tall:mt-8">
          {[
            "Agree or disagree, strongly or a little.",
            "See who’s with you after each answer.",
            "Get your closest five, and five to argue with.",
          ].map((line, k) => (
            <li key={k} className="flex gap-4 border-b border-rule py-2.5 tall:py-4">
              <span className="eyebrow w-5 shrink-0 pt-[0.4em] tabular-nums">{["i", "ii", "iii"][k]}</span>
              <span className="font-display text-[1.15rem] leading-snug text-ink tall:text-[1.3rem]">{line}</span>
            </li>
          ))}
        </ol>
      </m.div>
      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-paper via-paper to-paper/0 px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] tall:pt-6 tall:pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:px-0 sm:tall:pt-10 sm:tall:pb-16">
        <button type="button" onClick={onStart} className={`${primary} w-full`}>
          Begin
          <ArrowRight className="h-[18px] w-[18px]" />
        </button>
        <p className="mt-3 text-center text-[0.78rem] text-muted">Takes ~ 3 minutes. Your answers stay on this device.</p>
      </div>
    </div>
  );
}

// ---------- Statements ----------

function Questions({
  run,
  setRun,
  onFinish,
  onLeave,
}: {
  run: Run;
  setRun: (r: Run | null) => void;
  onFinish: (answers: (Answer | undefined)[]) => void;
  onLeave: () => void;
}) {
  const statement = STATEMENTS[run.i];
  const a = run.answers[run.i];
  const revealed = run.revealed && a != null;
  const last = run.i + 1 >= N;

  const withAnswer = (v: Answer) => {
    const answers = run.answers.slice();
    answers[run.i] = v;
    return answers;
  };
  const choose = (v: Exclude<Answer, null>) => setRun({ ...run, answers: withAnswer(v), revealed: true });
  const advance = (answers: (Answer | undefined)[]) =>
    last ? onFinish(answers) : setRun({ i: run.i + 1, answers, revealed: answers[run.i + 1] != null });
  const next = () => advance(run.answers);
  const skip = () => advance(withAnswer(null));
  const back = () => (run.i === 0 ? setRun(null) : setRun({ ...run, i: run.i - 1, revealed: run.answers[run.i - 1] != null }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = Number(e.key);
      if (k >= 1 && k <= 5) choose((k - 3) as Exclude<Answer, null>);
      else if ((e.key === "Enter" || e.key === "ArrowRight") && revealed) next();
      else if (e.key === "ArrowLeft") back();
      else if (e.key === "Escape") onLeave();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col px-4 sm:px-8">
      <QuizNav
        left={
          <button
            type="button"
            onClick={onLeave}
            aria-label="Leave the quiz"
            className="-ml-2.5 grid h-11 w-11 place-items-center rounded-full text-ink-2 hover:text-ink"
          >
            <Close className="h-5 w-5" />
          </button>
        }
        center={<Progress i={run.i} />}
      />

      <m.div key={statement.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="pt-3 tall:pt-8 sm:tall:pt-16">
        <p className="eyebrow flex items-center gap-2">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
          {statement.question}
        </p>
        {/* Steps down once answered, making room for who's with you without scrolling. */}
        <h1
          className={`mt-2.5 font-display leading-[1.06] font-semibold tracking-[-0.005em] text-balance text-ink transition-[font-size] duration-300 ease-out tall:mt-3 ${
            revealed ? "text-[1.6rem] tall:text-[2.1rem] sm:tall:text-[2.75rem]" : "text-[2.25rem] tall:text-[2.5rem] sm:tall:text-[3.5rem]"
          }`}
        >
          {statement.text}
        </h1>
      </m.div>

      <Scale value={a ?? undefined} onChoose={choose} />
      <p className="mt-5 text-center text-[0.75rem] text-muted max-md:hidden">Keys 1–5 to answer · Enter for the next · ← to go back</p>

      {revealed && <Reveal key={`reveal-${statement.id}`} statement={statement} a={a} />}

      <div className="min-h-1 flex-1 tall:min-h-8" />
      <footer className="sticky bottom-0 -mx-4 mt-2 flex tall:mt-6 items-center justify-between gap-3 border-t border-rule bg-paper/95 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:-mx-8 sm:px-8 sm:pb-4">
        <button type="button" onClick={back} className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-[0.9rem] font-medium text-ink-2 hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        {revealed ? (
          <button type="button" onClick={next} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[0.9rem] font-medium text-paper">
            {last ? "See your results" : "Next statement"}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={skip} className="-mr-2 inline-flex min-h-11 items-center rounded-full px-2 text-[0.9rem] font-medium text-ink-2 hover:text-ink">
            Skip this one
          </button>
        )}
      </footer>
    </div>
  );
}

function Progress({ i }: { i: number }) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <div aria-hidden className="grid w-28 grid-cols-14 gap-[3px] sm:w-56">
        {STATEMENTS.map((s, k) => (
          <span key={s.id} className={`h-[3px] rounded-full ${k < i ? "bg-ink" : k === i ? "bg-accent" : "bg-rule"}`} />
        ))}
      </div>
      <span className="text-[0.78rem] whitespace-nowrap text-muted tabular-nums">
        <span className="font-semibold text-ink">{i + 1}</span> of {N}
      </span>
    </div>
  );
}

type Tone = "agree" | "disagree" | "neutral";
const TONE: Record<Tone, { idle: string; faded: string; on: string; text: string }> = {
  agree: { idle: "border-accent hover:bg-accent/10", faded: "border-accent/35 hover:border-accent", on: "border-accent bg-accent", text: "text-accent" },
  disagree: { idle: "border-disagree hover:bg-disagree/10", faded: "border-disagree/35 hover:border-disagree", on: "border-disagree bg-disagree", text: "text-disagree" },
  neutral: { idle: "border-muted hover:bg-muted/10", faded: "border-muted/35 hover:border-muted", on: "border-muted bg-muted", text: "text-ink" },
};
const OPTIONS: { v: Exclude<Answer, null>; label: string; caption: string; size: string; tone: Tone }[] = [
  { v: -2, label: "Strongly disagree", caption: "Strongly", size: "h-14 w-14 sm:h-[4.5rem] sm:w-[4.5rem]", tone: "disagree" },
  { v: -1, label: "Disagree a little", caption: "A little", size: "h-[2.625rem] w-[2.625rem] sm:h-14 sm:w-14", tone: "disagree" },
  { v: 0, label: "Not sure", caption: "Not sure", size: "h-[1.875rem] w-[1.875rem] sm:h-10 sm:w-10", tone: "neutral" },
  { v: 1, label: "Agree a little", caption: "A little", size: "h-[2.625rem] w-[2.625rem] sm:h-14 sm:w-14", tone: "agree" },
  { v: 2, label: "Strongly agree", caption: "Strongly", size: "h-14 w-14 sm:h-[4.5rem] sm:w-[4.5rem]", tone: "agree" },
];

/** Five circles from strongly disagree to strongly agree; size says how strongly. */
function Scale({ value, onChoose }: { value: Answer | undefined; onChoose: (v: Exclude<Answer, null>) => void }) {
  const answered = value != null;
  return (
    <div role="group" aria-label="How much do you agree?" className="mx-auto mt-4 w-full max-w-md tall:mt-10 sm:max-w-lg sm:tall:mt-14">
      <div aria-hidden className="flex justify-between px-1 pb-2.5 tall:pb-4">
        <span className="eyebrow text-disagree">Disagree</span>
        <span className="eyebrow text-accent">Agree</span>
      </div>
      <div className="flex items-start justify-between">
        {OPTIONS.map((o) => {
          const on = value === o.v;
          const tone = TONE[o.tone];
          return (
            <div key={o.v} className="flex w-16 flex-col items-center gap-2 tall:gap-2.5 sm:w-24">
              <div className="grid h-14 place-items-center sm:h-[4.5rem]">
                <button
                  type="button"
                  aria-label={o.label}
                  aria-pressed={on}
                  onClick={() => onChoose(o.v)}
                  className={`grid place-items-center rounded-full border-2 transition-colors duration-150 ${o.size} ${on ? tone.on : answered ? tone.faded : tone.idle}`}
                >
                  {on && <Check className="h-1/2 w-1/2 text-paper" strokeWidth={2.5} />}
                </button>
              </div>
              <span aria-hidden className={`text-center text-[0.7rem] leading-tight sm:text-[0.75rem] ${on ? `font-semibold ${tone.text}` : "text-muted"}`}>
                {o.caption}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** After an answer: where the idea comes from, and who stands with the reader and against. */
function Reveal({ statement, a }: { statement: Statement; a: Exclude<Answer, null> }) {
  const src = bySlug.get(statement.source)!;
  const { pro, con } = camps(statement);
  const columns: { label: string; tone: Tone; people: Philosopher[] }[] =
    a > 0
      ? [{ label: "With you", tone: "agree", people: pro }, { label: "Against you", tone: "disagree", people: con }]
      : a < 0
        ? [{ label: "With you", tone: "disagree", people: con }, { label: "Against you", tone: "agree", people: pro }]
        : [{ label: "Agree", tone: "agree", people: pro }, { label: "Disagree", tone: "disagree", people: con }];

  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <m.section
      ref={ref}
      aria-label="Who agrees"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      className="mt-3 scroll-mb-24 rounded-2xl bg-[var(--sheet)] p-4 shadow-[var(--shadow)] tall:mt-8 tall:p-5 sm:tall:mt-12 sm:tall:p-6"
    >
      <p className="eyebrow">Where this idea comes from</p>
      <div className="mt-2 flex items-center gap-3 tall:mt-3 tall:gap-3.5">
        <Thumb p={src} className="h-11 w-11 shrink-0 rounded-lg tall:h-14 tall:w-14" sizes="56px" />
        <div className="min-w-0">
          <p className="font-display text-[1.2rem] leading-tight font-semibold text-ink tall:text-[1.4rem]">{src.name}</p>
          <p className="mt-0.5 text-[0.72rem] tracking-[0.04em] text-muted tabular-nums">
            {src.aka && <span className="italic">{src.aka} · </span>}
            {lifespan(src)}
          </p>
        </div>
      </div>
      <p className="mt-2 font-display text-[1.1rem] leading-snug text-ink-2 italic tall:mt-3 tall:text-[1.3rem]">{statement.line}</p>
      <div className="mt-3 grid grid-cols-2 gap-4 border-t border-rule pt-3 tall:mt-5 tall:pt-4">
        {columns.map((c) => (
          <div key={c.label} className="min-w-0">
            <p className={`eyebrow ${TONE[c.tone].text}`}>
              {c.label} · {c.people.length}
            </p>
            <div className="mt-2 flex min-h-8 items-center tall:mt-2.5 tall:min-h-9">
              <FacePile people={c.people.slice(0, 4)} faceClass="h-8 w-8 ring-2 ring-[var(--sheet)] tall:h-9 tall:w-9" />
              {c.people.length > 4 && <span className="ml-1 text-[0.75rem] font-semibold text-muted tabular-nums">+{c.people.length - 4}</span>}
            </div>
            <p className="mt-1.5 text-[0.78rem] leading-snug text-ink-2 tall:mt-2 tall:text-[0.8rem]">{names(c.people)}</p>
          </div>
        ))}
      </div>
    </m.section>
  );
}

const names = (people: Philosopher[]) =>
  people.length ? listNames(people.map(shortName), 3) : `No one among the ${philosophers.length}.`;

// ---------- Results ----------

type Row = { m: Match; why?: string };

function Results({
  ranking,
  gridSearch,
  onClose,
  onRetake,
  onClear,
}: {
  ranking: Ranking;
  gridSearch: string;
  onClose: () => void;
  onRetake: () => void;
  onClear: () => void;
}) {
  const { list } = ranking;
  const enough = list.length >= 10;
  const [top, bottom] = useMemo(() => {
    // Each row gives a reason no earlier row has given, so the page doesn't repeat itself.
    const used = new Set<string>();
    const pick = (rs: Reason[]) => {
      const r = rs.find((x) => !used.has(x.text)) ?? rs[0];
      if (r) used.add(r.text);
      return r?.text;
    };
    const row = (m: Match, reasons: Reason[], lead: string): Row => {
      const why = pick(reasons);
      return { m, why: why && `${lead} ${why}` };
    };
    return [
      list.slice(0, 5).map((m) => row(m, m.meet, "Both:")),
      list.slice(-5).reverse().map((m) => row(m, m.split, "They say:")),
    ];
  }, [list]);

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-8">
      <QuizNav
        left={<BackButton onClick={onClose}>All philosophers</BackButton>}
        right={
          <button type="button" onClick={onRetake} className="rounded-full px-3 py-2 text-[0.85rem] font-medium text-accent hover:underline">
            Retake
          </button>
        }
      />
      <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease }}>
        <header className="pt-4 sm:pt-8">
          <p className="eyebrow">
            Your results · {ranking.answered} of {N} answered
          </p>
          <h1 className="mt-3 font-display text-[2.9rem] leading-[0.98] font-semibold tracking-[-0.01em] text-ink sm:text-[4.5rem]">
            Your philosophers
          </h1>
          <p className="mt-4 max-w-xl font-display text-[1.3rem] leading-snug text-ink-2 italic sm:text-[1.5rem]">
            The five most likely to take your side, and five who’d argue with you.
          </p>
        </header>

        {enough ? (
          <>
            <section aria-label="Closest to you" className="mt-10 sm:mt-14">
              <p className="eyebrow border-b border-rule pb-3">Closest to you</p>
              <RowList rows={top} tone="agree" gridSearch={gridSearch} />
            </section>
            <section aria-label="Five to argue with" className="mt-14 sm:mt-20">
              <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2 border-b border-rule pb-3">
                <div>
                  <p className="eyebrow">Furthest from you</p>
                  <h2 className="mt-2 font-display text-[1.85rem] leading-tight font-semibold text-ink italic">Five to argue with</h2>
                </div>
                <p className="max-w-md text-[0.875rem] leading-relaxed text-ink-2">Reading the other side is the fastest way to test what you believe.</p>
              </div>
              <RowList rows={bottom} tone="disagree" gridSearch={gridSearch} />
            </section>
            <div className="mt-12 flex flex-col items-stretch gap-3 sm:mt-16 sm:flex-row sm:justify-center">
              <Link to={{ pathname: "/", search: "?sort=match" }} className={primary}>
                See all {list.length}, ranked for you
                <ArrowRight className="h-[18px] w-[18px]" />
              </Link>
              <button type="button" onClick={onRetake} className={secondary}>
                Retake the quiz
              </button>
            </div>
          </>
        ) : (
          <div className="mt-10 rounded-2xl bg-paper-2 p-6">
            <p className="font-display text-[1.6rem] text-ink-2 italic">Too many skips to rank anyone yet.</p>
            <button type="button" onClick={onRetake} className={`${primary} mt-5`}>
              Take it again
            </button>
          </div>
        )}

        <p className="mx-auto mt-10 max-w-2xl pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center text-[0.78rem] leading-relaxed text-muted">
          Your answers stay in this browser. Matches are rough: each stance is our compressed reading, not the philosopher’s final
          word.{" "}
          <button type="button" onClick={onClear} className="font-medium text-accent underline-offset-2 hover:underline">
            Clear my answers
          </button>
        </p>
      </m.div>
    </div>
  );
}

function RowList({ rows, tone, gridSearch }: { rows: Row[]; tone: "agree" | "disagree"; gridSearch: string }) {
  const color = tone === "agree" ? "text-accent" : "text-disagree";
  const fill = tone === "agree" ? "bg-accent" : "bg-disagree";
  return (
    <ol className="md:mt-6 md:grid md:grid-cols-5 md:gap-6">
      {rows.map(({ m: r, why }) => (
        <li key={r.p.slug}>
          <Link
            to={`/p/${r.p.slug}`}
            state={{ fromQuiz: true, gridSearch } satisfies DetailState}
            className="group flex items-center gap-3.5 border-b border-rule py-3.5 md:h-full md:flex-col md:items-stretch md:gap-0 md:border-0 md:py-0"
          >
            <span className="w-7 shrink-0 font-display text-[1.35rem] text-muted tabular-nums md:hidden">{r.rank}</span>
            <Thumb
              p={r.p}
              sizes="(min-width: 768px) 20vw, 56px"
              className="h-14 w-14 shrink-0 rounded-lg md:h-auto md:w-full md:rounded-[10px] md:shadow-[var(--shadow)] md:transition-transform md:duration-500 md:group-hover:-translate-y-1"
            />
            <span className="block min-w-0 flex-1 md:mt-3.5">
              <span className="eyebrow block max-md:hidden">No. {r.rank}</span>
              <span className="block truncate font-display text-[1.25rem] leading-tight font-semibold text-ink md:mt-1.5 md:text-[1.35rem] md:whitespace-normal">
                {r.p.name}
              </span>
              {why && <span className="mt-0.5 block text-[0.8rem] leading-snug text-muted md:mt-1.5">{why}</span>}
            </span>
            {/* Pinned to the bottom of each card, so the meters line up across the row. */}
            <span className="shrink-0 text-right md:mt-auto md:flex md:items-center md:gap-2.5 md:pt-3">
              <span className={`block text-[0.95rem] font-semibold tabular-nums ${color}`}>{r.pct}%</span>
              <span className="mt-1.5 block h-[3px] w-11 overflow-hidden rounded-full bg-rule md:mt-0 md:w-auto md:flex-1">
                <span className={`block h-full ${fill}`} style={{ width: `${r.pct}%` }} />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
