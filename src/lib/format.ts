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

/** Born year alone, for timeline rows: "624 BCE", "354 CE", "1711". */
export function bornLabel(p: Pick<Philosopher, "born">): string {
  if (p.born < 0) return `${-p.born} BCE`;
  return p.born < 1000 ? `${p.born} CE` : String(p.born);
}

const SHORT_NAME: Record<string, string> = {
  buddha: "Buddha",
  augustine: "Augustine",
  "zeno-of-citium": "Zeno",
  "marcus-aurelius": "Marcus",
  "al-ghazali": "Al-Ghazali",
  "wang-yangming": "Wang Yangming",
  "zhu-xi": "Zhu Xi",
  "william-james": "William James",
};

/** The name people know them by, for tight labels: "Plato", "Kant", "Buddha". */
export function shortName(p: Philosopher): string {
  return SHORT_NAME[p.slug] ?? p.name.split(" ").at(-1)!;
}

const PARTICLES = new Set(["de", "of", "von", "van", "the"]);

/** "Nāgārjuna" → "N", "Michel de Montaigne" → "MM". */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => !PARTICLES.has(w.toLowerCase()) && !w.endsWith("."));
  const pick = words.length > 1 ? [words[0], words.at(-1)!] : words;
  return pick.map((w) => w[0]).join("");
}

/** "Kant", "Kant and Hume", "Kant, Hume and Mill"; past `max`, "Kant, Hume, Mill and 4 more". */
export function listNames(names: string[], max = Infinity): string {
  if (names.length > max) return `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Strip diacritics + lowercase, for search. */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}
