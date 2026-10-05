import type { Philosopher } from "../data/philosophers";

/** "c. 470–399 BCE", "c. 4 BCE–65 CE", "354–430 CE", "1711–1776". */
export function lifespan(p: Pick<Philosopher, "born" | "died" | "circa">): string {
  const c = p.circa ? "c. " : "";
  if (p.died < 0) return `${c}${-p.born}–${-p.died} BCE`;
  if (p.born < 0) return `${c}${-p.born} BCE–${p.died} CE`;
  return `${c}${p.born}–${p.died}${p.died < 1000 ? " CE" : ""}`;
}

const SORT_NAME: Record<string, string> = {
  buddha: "Buddha",
  augustine: "Augustine",
  "zeno-of-citium": "Zeno",
  "al-ghazali": "Ghazali",
  // Chinese names are family name first.
  "wang-yangming": "Wang Yangming",
  "zhu-xi": "Zhu Xi",
};

/** Surname-style key for alphabetical sort. */
export function sortName(p: Philosopher): string {
  return SORT_NAME[p.slug] ?? p.name.split(" ").at(-1)!;
}

const PARTICLES = new Set(["de", "of", "von", "van", "the"]);

/** "Nāgārjuna" → "N", "Michel de Montaigne" → "MM". */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => !PARTICLES.has(w.toLowerCase()) && !w.endsWith("."));
  const pick = words.length > 1 ? [words[0], words.at(-1)!] : words;
  return pick.map((w) => w[0]).join("");
}

/** Strip diacritics + lowercase, for search. */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}
