import { useCallback, useSyncExternalStore } from "react";
import { bySlug, philosophers, type Philosopher } from "../data/philosophers";
import { STATEMENTS, type Statement } from "../data/quiz";

/** Strongly disagree (-2) to strongly agree (2); null = skipped. */
export type Answer = -2 | -1 | 0 | 1 | 2 | null;

/** A finished run, one answer per statement. */
export type Saved = { answers: Answer[] };

/** A view shared with, or held against, the reader. */
export type Reason = { statement: Statement; text: string; weight: number };

export type Match = {
  p: Philosopher;
  /** 0–100: how close their stances sit to the reader's answers. */
  pct: number;
  /** 1 = closest. */
  rank: number;
  /** Statements both answered. */
  n: number;
  /** Of those, how many on the same side. */
  agree: number;
  /** Shared views, strongest first, in the reader's words. */
  meet: Reason[];
  /** Views they hold against the reader, strongest first, in their words. */
  split: Reason[];
};

export type Ranking = {
  /** Everyone with at least two answered stances, closest first. */
  list: Match[];
  bySlug: Map<string, Match>;
  answered: number;
};

/** Below this many shared statements a percentage says nothing, so they go unranked. */
const MIN_SHARED = 2;
/** Pulls thin overlaps toward 50%, so two lucky agreements don't outrank six. */
const PRIOR = 1.5;

export function rank(answers: Answer[]): Ranking {
  const list: Omit<Match, "rank">[] = [];
  for (const p of philosophers) {
    let sum = 0;
    let n = 0;
    let agree = 0;
    const meet: Reason[] = [];
    const split: Reason[] = [];
    STATEMENTS.forEach((statement, k) => {
      const s = statement.stances[p.slug];
      const a = answers[k];
      if (s == null || a == null) return;
      sum += 1 - Math.abs(a - s) / 4;
      n++;
      const weight = Math.abs(a) + Math.abs(s);
      if (a !== 0 && Math.sign(a) === Math.sign(s)) {
        agree++;
        meet.push({ statement, weight, text: a > 0 ? statement.agree : statement.disagree });
      } else if (a !== 0) {
        split.push({ statement, weight, text: s > 0 ? statement.agree : statement.disagree });
      }
    });
    if (n < MIN_SHARED) continue;
    const byWeight = (x: Reason, y: Reason) => y.weight - x.weight;
    list.push({ p, pct: Math.round(((sum + PRIOR / 2) / (n + PRIOR)) * 100), n, agree, meet: meet.sort(byWeight), split: split.sort(byWeight) });
  }
  // Ties: more shared statements first, then chronological (the data order).
  list.sort((x, y) => y.pct - x.pct || y.n - x.n);
  const ranked = list.map((m, i): Match => ({ ...m, rank: i + 1 }));
  return {
    list: ranked,
    bySlug: new Map(ranked.map((m) => [m.p.slug, m])),
    answered: answers.filter((a) => a != null).length,
  };
}

/** Who agrees and who disagrees with a statement (its source aside), strongest stances first. */
export function camps(statement: Statement): { pro: Philosopher[]; con: Philosopher[] } {
  const pro: Philosopher[] = [];
  const con: Philosopher[] = [];
  const entries = Object.entries(statement.stances).sort(([, x], [, y]) => Math.abs(y) - Math.abs(x));
  for (const [slug, s] of entries) {
    if (slug !== statement.source) (s > 0 ? pro : con).push(bySlug.get(slug)!);
  }
  return { pro, con };
}

// ---------- Storage ----------
// The last finished run, kept on this device. Read through useSyncExternalStore with a null server
// snapshot, so prerendered pages hydrate without results and pick them up right after.

const KEY = "quiz";
const listeners = new Set<() => void>();
let loaded = false;
let saved: Saved | null = null;
let ranking: Ranking | null = null;

function parse(raw: string | null): Saved | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Saved;
    const ok =
      Array.isArray(v?.answers) &&
      v.answers.length === STATEMENTS.length &&
      v.answers.every((a) => a === null || (Number.isInteger(a) && Math.abs(a) <= 2));
    return ok ? { answers: v.answers } : null;
  } catch {
    return null;
  }
}

function current(): Saved | null {
  if (!loaded) {
    loaded = true;
    try {
      saved = parse(localStorage.getItem(KEY));
    } catch {
      saved = null;
    }
  }
  return saved;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function store(next: Saved | null) {
  loaded = true;
  saved = next;
  ranking = null;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: results last for this visit */
  }
  listeners.forEach((l) => l());
}

/** The last finished run, and a way to replace or clear it. */
export function useSavedQuiz(): [Saved | null, (next: Saved | null) => void] {
  const value = useSyncExternalStore(subscribe, current, () => null);
  return [value, useCallback(store, [])];
}

/** Everyone ranked against the last finished run, or null before the quiz is taken. */
export function useRanking(): Ranking | null {
  const [value] = useSavedQuiz();
  if (!value) return null;
  ranking ??= rank(value.answers);
  return ranking;
}
