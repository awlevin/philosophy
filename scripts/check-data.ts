/**
 * Data checks that types can't express. Runs first in `npm run build`.
 * - A take answers a question the philosopher is tagged with.
 * - Every philosopher tagged with a finished question has a take for it.
 */
import { QUESTIONS, bySlug, philosophers, type BigQuestion } from "../src/data/philosophers";
import { STATEMENTS } from "../src/data/quiz";

/** Questions whose takes are written for everyone tagged with them. */
const FINISHED: readonly BigQuestion[] = QUESTIONS;

const problems: string[] = [];
for (const p of philosophers) {
  for (const q of Object.keys(p.takes ?? {}) as BigQuestion[]) {
    if (!p.questions.includes(q)) problems.push(`${p.slug}: has a take on “${q}” but isn’t tagged with it`);
  }
  for (const q of FINISHED) {
    if (p.questions.includes(q) && !p.takes?.[q]) problems.push(`${p.slug}: tagged “${q}” but has no take`);
  }
}

// The quiz: stances name real philosophers, each source holds its idea and is quoted verbatim,
// and everyone has enough stances to be ranked.
const stances = new Map(philosophers.map((p) => [p.slug, 0]));
for (const s of STATEMENTS) {
  const src = bySlug.get(s.source);
  if (!src) problems.push(`quiz “${s.id}”: unknown source ${s.source}`);
  else {
    if (s.stances[s.source] !== 2) problems.push(`quiz “${s.id}”: source ${s.source} should strongly agree (2)`);
    const lines = [...src.facts, ...Object.values(src.takes ?? {})];
    if (!lines.includes(s.line)) problems.push(`quiz “${s.id}”: line isn’t one of ${s.source}’s facts or takes`);
  }
  for (const slug of Object.keys(s.stances)) {
    if (!stances.has(slug)) problems.push(`quiz “${s.id}”: unknown philosopher ${slug}`);
    else stances.set(slug, stances.get(slug)! + 1);
  }
}
for (const [slug, n] of stances) {
  if (n < 2) problems.push(`quiz: ${slug} has ${n} stance${n === 1 ? "" : "s"}; needs 2 to be ranked`);
}

if (problems.length) {
  console.error(`Data check failed:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`Data check: ${philosophers.length} philosophers and ${STATEMENTS.length} quiz statements OK.`);
