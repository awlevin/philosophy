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

export type SortMode = "chrono" | "alpha";

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

export function parseFilters(search: string): Filters {
  const sp = new URLSearchParams(search);
  return {
    eras: eraCodec.decode(sp.get("era")),
    traditions: traditionCodec.decode(sp.get("tradition")),
    questions: questionCodec.decode(sp.get("question")),
    q: sp.get("q") ?? "",
    sort: sp.get("sort") === "alpha" ? "alpha" : "chrono",
  };
}

export function serializeFilters(f: Filters): string {
  const sp = new URLSearchParams();
  const set = (k: string, v: string) => v && sp.set(k, v);
  set("era", eraCodec.encode(f.eras));
  set("tradition", traditionCodec.encode(f.traditions));
  set("question", questionCodec.encode(f.questions));
  set("q", f.q);
  if (f.sort === "alpha") sp.set("sort", "alpha");
  // Keep commas readable in the address bar.
  const s = sp.toString().replace(/%2C/g, ",");
  return s ? `?${s}` : "";
}

export const activeCount = (f: Filters) => f.eras.length + f.traditions.length + f.questions.length;

/** OR within a group, AND across groups; name search matches name + aka, diacritics-insensitive. */
export function applyFilters(list: Philosopher[], f: Filters): Philosopher[] {
  const q = fold(f.q.trim());
  const out = list.filter(
    (p) =>
      (!f.eras.length || f.eras.includes(p.era)) &&
      (!f.traditions.length || p.tradition.some((t) => f.traditions.includes(t))) &&
      (!f.questions.length || p.questions.some((x) => f.questions.includes(x))) &&
      (!q || fold(`${p.name} ${p.aka ?? ""}`).includes(q)),
  );
  if (f.sort === "alpha") {
    out.sort((a, b) => sortName(a).localeCompare(sortName(b), "en", { sensitivity: "base" }));
  }
  return out;
}

export const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
