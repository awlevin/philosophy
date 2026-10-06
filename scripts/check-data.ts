/**
 * Data checks that types can't express. Runs first in `npm run build`.
 * - A take answers a question the philosopher is tagged with.
 * - Every philosopher tagged with a finished question has a take for it.
 */
import { philosophers, type BigQuestion } from "../src/data/philosophers";

/** Questions whose takes are written for everyone tagged with them. Add each as it's finished. */
const FINISHED: BigQuestion[] = ["How should we be ruled?"];

const problems: string[] = [];
for (const p of philosophers) {
  for (const q of Object.keys(p.takes ?? {}) as BigQuestion[]) {
    if (!p.questions.includes(q)) problems.push(`${p.slug}: has a take on “${q}” but isn’t tagged with it`);
  }
  for (const q of FINISHED) {
    if (p.questions.includes(q) && !p.takes?.[q]) problems.push(`${p.slug}: tagged “${q}” but has no take`);
  }
}

if (problems.length) {
  console.error(`Data check failed:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`Data check: ${philosophers.length} philosophers OK.`);
