export const ERAS = [
  "Ancient",
  "Medieval",
  "Early Modern",
  "Modern",
  "Contemporary",
] as const;
export type Era = (typeof ERAS)[number];

export const ERA_RANGES: Record<Era, string> = {
  Ancient: "before 500 CE",
  Medieval: "500–1500",
  "Early Modern": "1500–1800",
  Modern: "1800–1900",
  Contemporary: "1900–",
};

export const TRADITIONS = [
  "Greek",
  "Roman/Hellenistic",
  "Chinese",
  "Indian",
  "Islamic",
  "Jewish",
  "Scholastic",
  "Renaissance",
  "Rationalist",
  "Empiricist",
  "Enlightenment",
  "German Idealism",
  "Existentialist",
  "Pragmatist",
  "Phenomenology",
  "Analytic",
  "Continental/Critical",
] as const;
export type Tradition = (typeof TRADITIONS)[number];

export const QUESTIONS = [
  "What exists?",
  "What can I know?",
  "How should I live?",
  "How should we be ruled?",
  "What is the mind?",
  "What is beautiful?",
  "What is logic & language?",
] as const;
export type BigQuestion = (typeof QUESTIONS)[number];

export type Portrait = {
  /** Path under /public, e.g. "/portraits/plato.jpg". Empty string = monogram fallback. */
  src: string;
  credit: string;
  license: string;
  sourceUrl: string;
  /** CSS object-position override for face-centering inside the square crop. */
  focus?: string;
  /** Extra scale (e.g. 1.5) for images where the face is small in frame. */
  zoom?: number;
};

/** Where they were born. */
export type Origin = {
  /** As named at the time, e.g. "Königsberg". */
  place: string;
  /** The state or region then, when it isn't the modern country, e.g. "Prussia". */
  then?: string;
  /** Where that place is today, e.g. "Russia". */
  country: string;
  /** Rests on tradition rather than record. */
  traditional?: boolean;
};

export type Philosopher = {
  slug: string;
  name: string;
  /** Alternate name shown under the main one and matched by search. */
  aka?: string;
  /** Negative = BCE. */
  born: number;
  died: number;
  /** Dates are approximate. */
  circa?: boolean;
  origin: Origin;
  era: Era;
  /** Primary tradition first, optional secondary second. */
  tradition: [Tradition] | [Tradition, Tradition];
  questions: BigQuestion[];
  /** 4–6 skimmable statements, ≤ ~12 words each. */
  facts: string[];
  /**
   * Their answer to each Big Question they're tagged with, in one line (≤ ~18 words). Shown in the
   * peek sheet while that question is filtered. Only keys from `questions` (checked at build).
   */
  takes?: Partial<Record<BigQuestion, string>>;
  portrait: Portrait;
  wikidataId: string;
};
