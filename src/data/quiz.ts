import type { BigQuestion } from "./types";

/** How a philosopher would answer a statement: strongly disagree (-2) to strongly agree (2). */
export type Stance = -2 | -1 | 1 | 2;

export type Statement = {
  id: string;
  question: BigQuestion;
  /** What the reader reacts to. */
  text: string;
  /** The view in a few words, for "Both: …" and "They say: …" lines. */
  agree: string;
  disagree: string;
  /** Slug of the philosopher the idea comes from (stance 2). */
  source: string;
  /** One of the source's facts or takes, verbatim, that puts the idea best (checked at build). */
  line: string;
  /**
   * Our compressed reading of where each philosopher stands. Unlisted means no clear stance.
   * Every philosopher needs at least two, so everyone can be ranked (checked at build).
   */
  stances: Record<string, Stance>;
};

export const STATEMENTS: Statement[] = [
  {
    id: "will",
    question: "What is the mind?",
    text: "Everything that happens has a cause. Free will is an illusion.",
    agree: "Free will is an illusion.",
    disagree: "Free will is real.",
    source: "spinoza",
    line: "Free will is an illusion; freedom is understanding necessity.",
    stances: {
      spinoza: 2, hobbes: 2, schopenhauer: 1, "al-ghazali": 1, epictetus: 1, "zeno-of-citium": 1,
      sartre: -2, beauvoir: -2, kierkegaard: -2, "william-james": -1, descartes: -1, augustine: -1, kant: -1,
      epicurus: -1, boethius: -1, arendt: -1,
    },
  },
  {
    id: "happiness",
    question: "How should I live?",
    text: "Right and wrong come down to what makes people happier.",
    agree: "Right is what makes people happier.",
    disagree: "Right is more than happiness.",
    source: "mill",
    line: "Actions are right insofar as they promote happiness.",
    stances: {
      mill: 2, mozi: 2, epicurus: 1, hume: 1,
      kant: -2, confucius: -1, "thomas-aquinas": -1, rawls: -1, "zeno-of-citium": -1, epictetus: -1, seneca: -1,
      nietzsche: -1,
    },
  },
  {
    id: "certainty",
    question: "What can I know?",
    text: "You can’t be truly certain of anything.",
    agree: "Nothing is truly certain.",
    disagree: "Some things are certain.",
    source: "montaigne",
    line: "“What do I know?” Very little for certain; suspend judgment, and study yourself.",
    stances: {
      montaigne: 2, zhuangzi: 2, hume: 1, nagarjuna: 1, socrates: 1, quine: 1,
      descartes: -2, plato: -2, aristotle: -1, leibniz: -1, "thomas-aquinas": -1, frege: -1, husserl: -1,
      wittgenstein: -1, parmenides: -1, averroes: -1, "wang-yangming": -1,
    },
  },
  {
    id: "god",
    question: "What exists?",
    text: "God exists, and reason alone can show it.",
    agree: "Reason can prove God.",
    disagree: "Reason can’t prove God.",
    source: "thomas-aquinas",
    line: "Offered “Five Ways” to argue that God exists.",
    stances: {
      "thomas-aquinas": 2, avicenna: 2, descartes: 2, leibniz: 2, maimonides: 1, averroes: 1, berkeley: 1,
      augustine: 1, boethius: 1, spinoza: 1, locke: 1, wollstonecraft: 1,
      hume: -2, nietzsche: -2, marx: -2, russell: -2, sartre: -2, epicurus: -1, kierkegaard: -1, "al-ghazali": -1,
      "william-of-ockham": -1, "william-james": -1, montaigne: -1,
    },
  },
  {
    id: "less",
    question: "How should I live?",
    text: "A good life means wanting less.",
    agree: "A good life means wanting less.",
    disagree: "Wanting less isn’t the point.",
    source: "buddha",
    line: "Suffering comes from craving; end craving, and suffering ends.",
    stances: {
      buddha: 2, epicurus: 2, diogenes: 2, epictetus: 2, "zeno-of-citium": 2, seneca: 1, "marcus-aurelius": 1,
      laozi: 1, schopenhauer: 1, socrates: 1, boethius: 1, zhuangzi: 1, rousseau: 1,
      nietzsche: -1, machiavelli: -1,
    },
  },
  {
    id: "good",
    question: "How should we be ruled?",
    text: "People are basically good.",
    agree: "People are basically good.",
    disagree: "People aren’t basically good.",
    source: "mencius",
    line: "Argued that human nature is innately good.",
    stances: {
      mencius: 2, rousseau: 2, confucius: 1, "wang-yangming": 1, "zhu-xi": 1,
      hobbes: -2, machiavelli: -2, augustine: -1, schopenhauer: -1,
    },
  },
  {
    id: "feared",
    question: "How should we be ruled?",
    text: "A leader is better off feared than loved.",
    agree: "Better feared than loved.",
    disagree: "Better loved than feared.",
    source: "machiavelli",
    line: "Better to be feared than loved, if you can’t be both.",
    stances: {
      machiavelli: 2, hobbes: 1,
      confucius: -2, mencius: -2, laozi: -1, mozi: -1, "marcus-aurelius": -1, arendt: -1, seneca: -1, russell: -1,
      rawls: -1, diogenes: -1,
    },
  },
  {
    id: "mind",
    question: "What is the mind?",
    text: "Your mind is something more than your body.",
    agree: "The mind is more than the body.",
    disagree: "The mind is no more than the body.",
    source: "descartes",
    line: "A thinking, nonphysical substance, distinct from the body yet joined to it.",
    stances: {
      descartes: 2, plato: 2, avicenna: 2, augustine: 1, leibniz: 1, berkeley: 1, "adi-shankara": 1,
      "thomas-aquinas": 1, socrates: 1, boethius: 1, husserl: 1, maimonides: 1,
      hobbes: -2, epicurus: -2, spinoza: -1, quine: -1, nietzsche: -1, buddha: -1, wittgenstein: -1,
    },
  },
  {
    id: "choice",
    question: "How should I live?",
    text: "There is no fixed human nature. You make yourself by what you choose.",
    agree: "You make yourself by your choices.",
    disagree: "Human nature is fixed.",
    source: "sartre",
    line: "Choose freely and own every choice; you are nothing but what you make of yourself.",
    stances: {
      sartre: 2, beauvoir: 2, nietzsche: 1, kierkegaard: 1, foucault: 1, heidegger: 1, arendt: 1, wollstonecraft: 1,
      mencius: -2, aristotle: -1, "thomas-aquinas": -1, confucius: -1, hobbes: -1, "zhu-xi": -1,
    },
  },
  {
    id: "veil",
    question: "How should we be ruled?",
    text: "Design society as if you didn’t know where you’d land in it.",
    agree: "Judge society from behind a veil.",
    disagree: "The veil is the wrong test.",
    source: "rawls",
    line: "Choose society’s rules behind a “veil of ignorance.”",
    stances: {
      rawls: 2, kant: 1, mill: 1, wollstonecraft: 1, mozi: 1, marx: 1, beauvoir: 1, rousseau: 1,
      nietzsche: -2, machiavelli: -1, plato: -1, foucault: -1,
    },
  },
  {
    id: "senses",
    question: "What can I know?",
    text: "Everything you know starts with what you see, hear and touch.",
    agree: "Knowledge starts with the senses.",
    disagree: "Reason, not the senses, comes first.",
    source: "locke",
    line: "The mind starts as a blank slate, written on by experience.",
    stances: {
      locke: 2, hume: 2, "francis-bacon": 2, aristotle: 1, mill: 1, berkeley: 1, epicurus: 1, quine: 1,
      "william-james": 1, thales: 1, averroes: 1, "zhu-xi": 1, "william-of-ockham": 1,
      plato: -2, descartes: -2, leibniz: -2, parmenides: -2, kant: -1, "adi-shankara": -1, avicenna: -1, frege: -1,
      heraclitus: -1, "wang-yangming": -1,
    },
  },
  {
    id: "change",
    question: "What exists?",
    text: "Nothing stays the same. Change is all there is.",
    agree: "Change is all there is.",
    disagree: "Something lasts beneath change.",
    source: "heraclitus",
    line: "Everything flows: the world is constant change.",
    stances: {
      heraclitus: 2, buddha: 2, nagarjuna: 1, hegel: 1, zhuangzi: 1, laozi: 1, marx: 1, "marcus-aurelius": 1,
      parmenides: -2, "adi-shankara": -2, plato: -1,
    },
  },
  {
    id: "words",
    question: "What is logic & language?",
    text: "Most deep puzzles are really confusions about words.",
    agree: "Deep puzzles are about words.",
    disagree: "Deep puzzles run deeper than words.",
    source: "wittgenstein",
    line: "Early: language pictures facts. Later: meaning is use, within shared language-games.",
    stances: {
      wittgenstein: 2, "william-of-ockham": 1, russell: 1, frege: 1, quine: 1, nagarjuna: 1,
      hegel: -2, heidegger: -2, plato: -1, husserl: -1,
    },
  },
  {
    id: "science",
    question: "What exists?",
    text: "Science, not philosophy, has the final word on what’s real.",
    agree: "Science has the final word.",
    disagree: "Science doesn’t have the final word.",
    source: "quine",
    line: "Philosophy is continuous with science, not above it.",
    stances: {
      quine: 2, "francis-bacon": 2, thales: 2, russell: 1, hobbes: 1,
      husserl: -2, heidegger: -2, kierkegaard: -2, "adi-shankara": -1, plato: -1, "al-ghazali": -1, foucault: -1,
      hegel: -1,
    },
  },
];
