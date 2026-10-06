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

/** Groups an already sorted list: by era in time order, by initial in A–Z order. Empty groups are dropped. */
export function toSections(list: Philosopher[], sort: SortMode): Section[] {
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
