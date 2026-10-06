import { ERAS, ERA_RANGES, type Era, type Philosopher } from "../data/philosophers";
import { eraCodec, type SortMode } from "./filters";
import { fold, sortName } from "./format";

export type Section = {
  id: string;
  /** Era name, or a letter in A–Z order. */
  title: string;
  /** Era date range. */
  range?: string;
  era?: Era;
  items: Philosopher[];
};

/** How many make "Closest to you" and "Furthest from you" in the For-you order. */
const MATCH_BAND = 10;

/**
 * Groups an already sorted list: by era in time order, by initial in A–Z order, and in For-you order
 * into the closest ten, the furthest ten and everyone between. Empty groups are dropped.
 */
export function toSections(list: Philosopher[], sort: SortMode, rank?: { of: (p: Philosopher) => number | undefined; total: number }): Section[] {
  if (sort === "match" && rank) {
    const band = (p: Philosopher) => {
      const r = rank.of(p);
      return r == null ? 1 : r <= MATCH_BAND ? 0 : r > rank.total - MATCH_BAND ? 2 : 1;
    };
    return [
      { id: "match-closest", title: "Closest to you" },
      { id: "match-between", title: "In between" },
      { id: "match-furthest", title: "Furthest from you" },
    ]
      .map((s, k) => ({ ...s, items: list.filter((p) => band(p) === k) }))
      .filter((s) => s.items.length > 0);
  }
  if (sort === "chrono") {
    return ERAS.map((era) => ({
      id: `era-${eraCodec.key(era)}`,
      title: era,
      range: ERA_RANGES[era],
      era,
      items: list.filter((p) => p.era === era),
    })).filter((s) => s.items.length > 0);
  }
  const out: Section[] = [];
  for (const p of list) {
    const letter = fold(sortName(p)).charAt(0).toUpperCase();
    const last = out.at(-1);
    if (last?.title === letter) last.items.push(p);
    else out.push({ id: `letter-${letter}`, title: letter, items: [p] });
  }
  return out;
}
