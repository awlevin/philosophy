import type { Philosopher } from "../data/philosophers";
import { Thumb } from "./Portrait";

/**
 * Overlapping round faces. `faceClass` sizes each face and rings it in the color behind the pile
 * (e.g. "h-10 w-10 ring-2 ring-paper-2"), so the overlaps read as cut-outs.
 */
export function FacePile({ people, faceClass, className = "" }: { people: Philosopher[]; faceClass: string; className?: string }) {
  return (
    <span className={`flex shrink-0 pr-3 ${className}`}>
      {people.map((p) => (
        <Thumb key={p.slug} p={p} className={`-mr-3 shrink-0 rounded-full ${faceClass}`} />
      ))}
    </span>
  );
}
