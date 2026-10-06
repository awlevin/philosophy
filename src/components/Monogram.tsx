import { initials } from "../lib/format";

/** Fallback medallion for philosophers without a usable free portrait. */
export function Monogram({ name }: { name: string }) {
  const text = initials(name);
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={`${name} (no portrait available)`} className="h-full w-full">
      <rect width="200" height="200" fill="var(--portrait-bg, var(--paper-2))" />
      <circle cx="100" cy="100" r="74" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.7" />
      <circle cx="100" cy="100" r="68" fill="none" stroke="var(--accent)" strokeWidth="0.5" opacity="0.5" />
      <g opacity="0.55">
        {Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * Math.PI * 2;
          const r1 = 70.5;
          const r2 = i % 4 === 0 ? 73 : 72;
          return (
            <line
              key={i}
              x1={100 + r1 * Math.cos(a)}
              y1={100 + r1 * Math.sin(a)}
              x2={100 + r2 * Math.cos(a)}
              y2={100 + r2 * Math.sin(a)}
              stroke="var(--accent)"
              strokeWidth="0.6"
            />
          );
        })}
      </g>
      <text
        x="100"
        y="100"
        dy="0.34em"
        textAnchor="middle"
        fill="var(--ink-2)"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: text.length > 1 ? 58 : 76, letterSpacing: "0.02em" }}
      >
        {text}
      </text>
    </svg>
  );
}
