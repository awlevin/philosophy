import { m } from "framer-motion";
import { useId, type ReactNode } from "react";

type Option<T extends string> = { value: T; label: string; icon?: ReactNode };

/** One-of-N toggle with a sliding pill. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  const pill = useId();
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-flow-col auto-cols-fr gap-1 rounded-2xl bg-paper-2 p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className="relative flex h-10 items-center justify-center rounded-xl text-[0.85rem] font-semibold"
          >
            {on && (
              <m.span
                layoutId={`segmented-${pill}`}
                className="absolute inset-0 rounded-xl bg-ink"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className={`relative inline-flex items-center gap-2 transition-colors ${on ? "text-paper" : "text-ink-2"}`}>
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
