import { useEffect, useRef, useState } from "react";
import { Close, Search } from "./Icons";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name. */
  label: string;
  placeholder: string;
  /** Milliseconds of quiet typing before `onChange`, for searches that re-render a lot. Clearing is immediate. */
  debounce?: number;
  /** Size and shape of the field (height, radius, text size, left padding for the icon). */
  className: string;
  /** Left offset of the magnifier. */
  iconClassName: string;
};

/** A search box with a magnifier and, once there is text, a clear button. */
export function SearchField({ value, onChange, label, placeholder, debounce = 0, className, iconClassName }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  // What this field last sent. A different `value` arriving (Clear filters, the back button)
  // replaces what is typed; our own coming back, maybe a render late, does not.
  const [sent, setSent] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== sent) {
      setSent(value);
      setDraft(value);
    }
  }

  const send = (v: string) => {
    setSent(v);
    onChange(v);
  };
  const latest = useRef(send);
  latest.current = send;
  useEffect(() => {
    if (draft === sent) return;
    const t = setTimeout(() => latest.current(draft), debounce);
    return () => clearTimeout(t);
  }, [draft, sent, debounce]);

  const clear = () => {
    setDraft("");
    send("");
    input.current?.focus();
  };

  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted ${iconClassName}`} />
      <input
        ref={input}
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={`w-full bg-paper-2 pr-11 text-ink placeholder:text-muted focus:ring-2 focus:ring-ink/20 focus:outline-none ${className}`}
      />
      {draft && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          // A 44px target around a small, quiet glyph.
          className="absolute top-1/2 right-0 grid h-11 w-11 -translate-y-1/2 place-items-center text-muted transition-colors hover:text-ink"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-rule/80">
            <Close className="h-2.5 w-2.5" />
          </span>
        </button>
      )}
    </label>
  );
}
