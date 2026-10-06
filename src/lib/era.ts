import type { CSSProperties } from "react";
import type { Era } from "../data/philosophers";
import { eraCodec } from "./filters";

/**
 * Scopes an era's palette to an element: --era (dots, bars), --era-ink (text), --era-tint
 * (grounds), and --portrait-bg so portraits inside sit on the era's tint.
 */
export function eraVars(era: Era): CSSProperties {
  const k = eraCodec.key(era);
  return {
    "--era": `var(--era-${k})`,
    "--era-ink": `var(--era-${k}-ink)`,
    "--era-tint": `var(--era-${k}-tint)`,
    "--portrait-bg": `var(--era-${k}-tint)`,
  } as CSSProperties;
}
