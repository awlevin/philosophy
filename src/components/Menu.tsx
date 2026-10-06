import { AnimatePresence, m } from "framer-motion";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ease } from "../lib/motion";
import { Check } from "./Icons";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Phones get a bottom sheet; larger screens a popover under its button. */
  sheet: boolean;
  /** Popover alignment under its button. */
  align?: "left" | "right";
  width?: number;
  /** Sticks to the bottom: Clear / Show N, or nothing for simple pickers. */
  footer?: ReactNode;
  children: ReactNode;
};

/** A drop-down for one facet or setting: a popover on larger screens, a bottom sheet on phones. */
export function Menu({ open, onClose, title, sheet, align = "left", width = 320, footer, children }: Props) {
  useEffect(() => {
    if (!open || !sheet) return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, [open, sheet]);

  if (sheet) {
    // Portaled: the sticky bar's backdrop blur would otherwise trap `position: fixed` inside it.
    return createPortal(
      <AnimatePresence>
        {open && (
          <>
            <m.div
              key="scrim"
              data-menu
              aria-hidden
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[70] bg-[var(--scrim)]"
            />
            <m.div
              key="sheet"
              data-menu
              role="dialog"
              aria-modal="true"
              aria-label={title}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", transition: { duration: 0.22, ease: "easeIn" } }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
              className="fixed inset-x-0 bottom-0 z-[71] flex max-h-[82dvh] flex-col rounded-t-[22px] bg-[var(--sheet)] pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-lift)]"
            >
              <div aria-hidden className="mx-auto mt-2.5 mb-1 h-1 w-9 shrink-0 rounded-full bg-rule" />
              <div className="flex shrink-0 items-center justify-between px-4 pb-1">
                <h2 className="font-display text-[1.6rem] font-semibold text-ink">{title}</h2>
                <button type="button" onClick={onClose} className="h-11 px-1 text-[0.9rem] font-semibold text-ink">
                  Done
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
              {footer && <div className="shrink-0 border-t border-rule px-4 pt-3 pb-4">{footer}</div>}
            </m.div>
          </>
        )}
      </AnimatePresence>,
      document.body,
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="popover"
          data-menu
          role="dialog"
          aria-label={title}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
          transition={{ duration: 0.18, ease }}
          style={{ width, [align]: 0 } as CSSProperties}
          className="absolute top-full z-40 mt-2 flex max-h-[min(30rem,70vh)] flex-col overflow-hidden rounded-2xl border border-rule bg-[var(--sheet)] shadow-[var(--shadow-lift)]"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1.5">{children}</div>
          {footer && <div className="shrink-0 border-t border-rule px-3 py-2.5">{footer}</div>}
        </m.div>
      )}
    </AnimatePresence>
  );
}

/** A row in a menu: a checkbox (facets) or a radio (one-of settings), with an optional count. */
export function OptionRow({
  label,
  checked,
  onToggle,
  kind = "checkbox",
  count,
  lead,
  hint,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  kind?: "checkbox" | "radio";
  count?: number;
  /** A dot or icon before the label. */
  lead?: ReactNode;
  /** A muted line under the label. */
  hint?: string;
}) {
  return (
    <button
      type="button"
      role={kind === "radio" ? "radio" : "checkbox"}
      aria-checked={checked}
      onClick={onToggle}
      className={`flex min-h-11 w-full items-center gap-3 px-4 py-1.5 text-left transition-colors hover:bg-paper-2 ${checked ? "bg-paper-2/60" : ""}`}
    >
      <span
        aria-hidden
        className={`grid h-[18px] w-[18px] shrink-0 place-items-center border-[1.5px] transition-colors ${
          kind === "radio" ? "rounded-full" : "rounded-[5px]"
        } ${checked ? "border-ink bg-ink text-paper" : "border-rule"}`}
      >
        {checked && (kind === "radio" ? <span className="h-1.5 w-1.5 rounded-full bg-paper" /> : <Check className="h-3 w-3" strokeWidth={3} />)}
      </span>
      {lead}
      <span className="min-w-0 flex-1">
        <span className={`block text-[0.9rem] ${checked ? "font-semibold text-ink" : "text-ink-2"}`}>{label}</span>
        {hint && <span className="block text-[0.75rem] text-muted">{hint}</span>}
      </span>
      {count !== undefined && <span className="shrink-0 text-[0.78rem] text-muted tabular-nums">{count}</span>}
    </button>
  );
}
