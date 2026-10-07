import {
  ERAS,
  QUESTIONS,
  TRADITIONS,
  type BigQuestion,
  type Era,
  type Philosopher,
  type Tradition,
} from "../data/philosophers";
import { fold, sortName } from "./format";

/** By time, A–Z, or closest match first (once the quiz is taken). */
export type SortMode = "chrono" | "alpha" | "match";

export type Filters = {
  eras: Era[];
  traditions: Tradition[];
  questions: BigQuestion[];
  q: string;
  sort: SortMode;
};

const slugify = (s: string) => fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Short, readable URL keys for each taxonomy value. */
const QUESTION_KEYS: Record<BigQuestion, string> = {
  "What exists?": "exists",
  "What can I know?": "know",
  "How should I live?": "live",
  "How should we be ruled?": "ruled",
  "What is the mind?": "mind",
  "What is beautiful?": "beauty",
  "What is logic & language?": "logic",
};

function codec<T extends string>(values: readonly T[], key: (v: T) => string) {
  const toKey = new Map(values.map((v) => [v, key(v)]));
  const fromKey = new Map(values.map((v) => [key(v), v]));
  return {
    encode: (vs: T[]) => values.filter((v) => vs.includes(v)).map((v) => toKey.get(v)!).join(","),
    decode: (s: string | null) =>
      (s ?? "")
        .split(",")
        .map((k) => fromKey.get(k.trim()))
        .filter((v): v is T => !!v),
    key: (v: T) => toKey.get(v)!,
  };
}

export const eraCodec = codec(ERAS, slugify);
export const traditionCodec = codec(TRADITIONS, slugify);
export const questionCodec = codec(QUESTIONS, (q) => QUESTION_KEYS[q]);

const SORTS: readonly SortMode[] = ["chrono", "alpha", "match"];

export function parseFilters(search: string): Filters {
  const sp = new URLSearchParams(search);
  return {
    eras: eraCodec.decode(sp.get("era")),
    traditions: traditionCodec.decode(sp.get("tradition")),
    questions: questionCodec.decode(sp.get("question")),
    q: sp.get("q") ?? "",
    sort: SORTS.find((s) => s === sp.get("sort")) ?? "chrono",
  };
}

export function serializeFilters(f: Filters): string {
  const sp = new URLSearchParams();
  const set = (k: string, v: string) => v && sp.set(k, v);
  set("era", eraCodec.encode(f.eras));
  set("tradition", traditionCodec.encode(f.traditions));
  set("question", questionCodec.encode(f.questions));
  set("q", f.q);
  if (f.sort !== "chrono") sp.set("sort", f.sort);
  // Keep commas readable in the address bar.
  const s = sp.toString().replace(/%2C/g, ",");
  return s ? `?${s}` : "";
}

export const activeCount = (f: Filters) => f.eras.length + f.traditions.length + f.questions.length;

export const EMPTY_FILTERS: Filters = { eras: [], traditions: [], questions: [], q: "", sort: "chrono" };

/** One selected taxonomy value, e.g. Tradition: Greek. */
export type FilterToken =
  | { group: "era"; value: Era }
  | { group: "tradition"; value: Tradition }
  | { group: "question"; value: BigQuestion };

export const GROUP_LABELS: Record<FilterToken["group"], string> = {
  era: "Era",
  tradition: "Tradition",
  question: "Question",
};

export function tokenKey(t: FilterToken): string {
  switch (t.group) {
    case "era":
      return `era-${eraCodec.key(t.value)}`;
    case "tradition":
      return `tradition-${traditionCodec.key(t.value)}`;
    case "question":
      return `question-${questionCodec.key(t.value)}`;
  }
}

/** Shared layoutId: a chip on a detail page flies into the filter bar when tapped. */
export const filterChipId = (t: FilterToken) => `filter-chip-${tokenKey(t)}`;

export function activeTokens(f: Filters): FilterToken[] {
  return [
    ...f.eras.map((value): FilterToken => ({ group: "era", value })),
    ...f.traditions.map((value): FilterToken => ({ group: "tradition", value })),
    ...f.questions.map((value): FilterToken => ({ group: "question", value })),
  ];
}

export function hasToken(f: Filters, t: FilterToken): boolean {
  return activeTokens(f).some((x) => tokenKey(x) === tokenKey(t));
}

export function withoutToken(f: Filters, t: FilterToken): Filters {
  switch (t.group) {
    case "era":
      return { ...f, eras: f.eras.filter((v) => v !== t.value) };
    case "tradition":
      return { ...f, traditions: f.traditions.filter((v) => v !== t.value) };
    case "question":
      return { ...f, questions: f.questions.filter((v) => v !== t.value) };
  }
}

/** Filters selecting just this one value. */
export function onlyToken(t: FilterToken): Filters {
  switch (t.group) {
    case "era":
      return { ...EMPTY_FILTERS, eras: [t.value] };
    case "tradition":
      return { ...EMPTY_FILTERS, traditions: [t.value] };
    case "question":
      return { ...EMPTY_FILTERS, questions: [t.value] };
  }
}

/** Query string of a gallery showing just this one value. */
export const tokenSearch = (t: FilterToken) => serializeFilters(onlyToken(t));

/**
 * OR within a group, AND across groups; search matches name, aka and birthplace (then and now),
 * diacritics-insensitive. "match" order needs each philosopher's quiz rank; unranked ones keep time
 * order at the end.
 */
// One collator for every sort: localeCompare with options builds a new one for each comparison.
const collator = new Intl.Collator("en", { sensitivity: "base" });

export function applyFilters(list: Philosopher[], f: Filters, rankOf?: (p: Philosopher) => number | undefined): Philosopher[] {
  const q = fold(f.q.trim());
  const out = list.filter(
    (p) =>
      (!f.eras.length || f.eras.includes(p.era)) &&
      (!f.traditions.length || p.tradition.some((t) => f.traditions.includes(t))) &&
      (!f.questions.length || p.questions.some((x) => f.questions.includes(x))) &&
      (!q || fold(`${p.name} ${p.aka ?? ""} ${p.origin.place} ${p.origin.then ?? ""} ${p.origin.country}`).includes(q)),
  );
  if (f.sort === "alpha") {
    out.sort((a, b) => collator.compare(sortName(a), sortName(b)));
  } else if (f.sort === "match" && rankOf) {
    out.sort((a, b) => (rankOf(a) ?? Infinity) - (rankOf(b) ?? Infinity));
  }
  return out;
}

export const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
