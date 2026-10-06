import { m } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { ERAS, ERA_RANGES, QUESTIONS, TRADITIONS, philosophers } from "../data/philosophers";
import { eraVars } from "../lib/era";
import {
  EMPTY_FILTERS,
  GROUP_LABELS,
  activeTokens,
  applyFilters,
  filterChipId,
  onlyToken,
  toggle,
  tokenKey,
  withoutToken,
  type FilterToken,
  type Filters,
  type SortMode,
} from "../lib/filters";
import { fold } from "../lib/format";
import { morph } from "../lib/motion";
import { useMedia } from "../lib/useMedia";
import { useTapMode, type TapMode, type ViewMode } from "../lib/view";
import { ChevronDown, Close, Frame, Grid, List, Search } from "./Icons";
import { Menu, OptionRow } from "./Menu";

type Props = {
  filters: Filters;
  onChange: (f: Filters) => void;
  view: ViewMode;
  onView: (v: ViewMode) => void;
  shown: number;
  total: number;
  /** Key of a chip that just flew in from a detail page: ring it briefly so the eye lands on it. */
  arrivedKey?: string;
  /** Lift above the closing detail overlay while a chip flies in. */
  raised?: boolean;
  /** A menu opened (so the gallery can put its peek sheet away). */
  onMenuOpen?: () => void;
};

type MenuKey = "era" | "tradition" | "question" | "order" | "view";

const VIEWS: { value: ViewMode; label: string; hint: string; icon: ReactNode }[] = [
  { value: "faces", label: "Faces", hint: "A wall of portraits by era", icon: <Grid className="h-4 w-4" /> },
  { value: "list", label: "List", hint: "A timeline, one per row", icon: <List className="h-4 w-4" /> },
  { value: "classic", label: "Classic", hint: "The original sepia grid", icon: <Frame className="h-4 w-4" /> },
];
const TAPS: { value: TapMode; label: string; hint: string }[] = [
  { value: "peek", label: "Peek first", hint: "A quick look; tap again to open" },
  { value: "open", label: "Open the page", hint: "Straight to the full page" },
];
const ORDERS: { value: SortMode; label: string }[] = [
  { value: "chrono", label: "By time" },
  { value: "alpha", label: "A–Z" },
];

/** How many philosophers carry each value, for the counts beside every option. */
const COUNT = new Map(
  [
    ...ERAS.map((value): FilterToken => ({ group: "era", value })),
    ...TRADITIONS.map((value): FilterToken => ({ group: "tradition", value })),
    ...QUESTIONS.map((value): FilterToken => ({ group: "question", value })),
  ].map((t) => [tokenKey(t), applyFilters(philosophers, onlyToken(t)).length]),
);

/**
 * Sticky search bar with a menu per facet (Era, Tradition, Big question), order and view.
 * Larger screens get popovers under each button; phones get a row of pills that open bottom sheets.
 */
export function FilterBar({ filters, onChange, view, onView, shown, total, arrivedKey, raised, onMenuOpen }: Props) {
  const [menu, setMenu] = useState<MenuKey | null>(null);
  const [tap, setTap] = useTapMode();
  const sheet = !useMedia("(min-width: 768px)");
  const bar = useRef<HTMLDivElement>(null);
  useBarHeight(bar);

  const tokens = activeTokens(filters);
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const clear = () => onChange({ ...EMPTY_FILTERS, sort: filters.sort });
  const close = () => setMenu(null);
  const openMenu = (k: MenuKey) => {
    if (menu === k) return close();
    setMenu(k);
    onMenuOpen?.();
  };

  // Popovers close on a click elsewhere or Escape; sheets have their own scrim.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest("[data-filter-bar], [data-menu]")) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const facetFooter = (picked: number, clearGroup: () => void) => (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={clearGroup}
        disabled={picked === 0}
        className="py-2 text-[0.85rem] font-semibold text-accent disabled:text-muted disabled:opacity-60"
      >
        Clear
      </button>
      <button
        type="button"
        onClick={close}
        className={`rounded-full bg-ink font-semibold text-paper ${sheet ? "h-12 flex-1 text-[0.95rem]" : "h-9 px-4 text-[0.85rem]"}`}
      >
        Show {shown}
        {sheet && ` ${shown === 1 ? "philosopher" : "philosophers"}`}
      </button>
    </div>
  );

  const facets: { key: "era" | "tradition" | "question"; label: string; picked: string[]; body: ReactNode; clearGroup: () => void }[] = [
    {
      key: "era",
      label: "Era",
      picked: filters.eras,
      clearGroup: () => set({ eras: [] }),
      body: ERAS.map((e) => (
        <OptionRow
          key={e}
          label={e}
          hint={ERA_RANGES[e]}
          checked={filters.eras.includes(e)}
          onToggle={() => set({ eras: toggle(filters.eras, e) })}
          count={COUNT.get(tokenKey({ group: "era", value: e }))}
          lead={<span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--era)]" style={eraVars(e)} />}
        />
      )),
    },
    {
      key: "tradition",
      label: "Tradition",
      picked: filters.traditions,
      clearGroup: () => set({ traditions: [] }),
      body: <TraditionOptions filters={filters} set={set} />,
    },
    {
      key: "question",
      label: "Big question",
      picked: filters.questions,
      clearGroup: () => set({ questions: [] }),
      body: QUESTIONS.map((q) => (
        <OptionRow
          key={q}
          label={q}
          checked={filters.questions.includes(q)}
          onToggle={() => set({ questions: toggle(filters.questions, q) })}
          count={COUNT.get(tokenKey({ group: "question", value: q }))}
        />
      )),
    },
  ];

  const orderLabel = ORDERS.find((o) => o.value === filters.sort)!.label;
  const orderMenu = (
    <Menu open={menu === "order"} onClose={close} title="Order" sheet={sheet} align="right" width={200}>
      {ORDERS.map((o) => (
        <OptionRow
          key={o.value}
          kind="radio"
          label={o.label}
          checked={filters.sort === o.value}
          onToggle={() => {
            set({ sort: o.value });
            close();
          }}
        />
      ))}
    </Menu>
  );
  const current = VIEWS.find((v) => v.value === view)!;

  return (
    <div
      ref={bar}
      data-filter-bar
      className={`sticky top-0 ${raised ? "z-[60]" : "z-30"} border-b border-rule bg-paper/90 backdrop-blur-md supports-[backdrop-filter]:bg-paper/75`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-4 py-3 sm:px-8">
        <label className="relative min-w-0 flex-1 md:max-w-xs">
          <span className="sr-only">Search by name</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder={`Search ${total} names`}
            autoComplete="off"
            spellCheck={false}
            className="h-11 w-full rounded-full bg-paper-2 pr-3 pl-10 text-base text-ink sm:text-[0.95rem] placeholder:text-muted focus:ring-2 focus:ring-ink/20 focus:outline-none"
          />
        </label>

        {/* Larger screens: a button per facet with its popover. Phones open the same menus as sheets. */}
        {facets.map((f) => (
          <div key={f.key} className="relative hidden md:block">
            <FacetButton label={f.label} picked={f.picked} open={menu === f.key} onClick={() => openMenu(f.key)} />
            <Menu
              open={menu === f.key}
              onClose={close}
              title={f.label}
              sheet={sheet}
              width={f.key === "question" ? 300 : 280}
              footer={facetFooter(f.picked.length, f.clearGroup)}
            >
              {f.body}
            </Menu>
          </div>
        ))}

        <span className="flex-1 max-md:hidden" />
        {tokens.length === 0 && (
          <span className="mr-1 text-[0.78rem] text-muted tabular-nums max-md:hidden" aria-live="polite">
            {shown === total ? `${total} philosophers` : `${shown} of ${total}`}
          </span>
        )}

        {/* The pill slides with CSS, not a shared layout: layout nodes in this sticky bar get re-measured
            whenever the page below reflows, and read the bar's sticking as movement. */}
        <div role="radiogroup" aria-label="Show as" className="relative flex rounded-full bg-paper-2 p-[3px] max-md:hidden">
          <span
            aria-hidden
            className="absolute top-[3px] left-[3px] h-[38px] w-[38px] rounded-full bg-ink transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(${VIEWS.findIndex((v) => v.value === view) * 38}px)` }}
          />
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              role="radio"
              aria-checked={view === v.value}
              aria-label={v.label}
              title={v.label}
              onClick={() => onView(v.value)}
              className={`relative grid h-[38px] w-[38px] place-items-center rounded-full transition-colors ${
                view === v.value ? "text-paper" : "text-ink-2 hover:text-ink"
              }`}
            >
              <span className="relative">{v.icon}</span>
            </button>
          ))}
        </div>

        <div className="relative max-md:hidden">
          <BarButton open={menu === "order"} onClick={() => openMenu("order")}>
            {orderLabel}
          </BarButton>
          {!sheet && orderMenu}
        </div>

        {/* Phones: the view sits behind one icon button. */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => openMenu("view")}
            aria-label={`Show as: ${current.label}`}
            aria-expanded={menu === "view"}
            className="grid h-11 w-11 place-items-center rounded-full border border-rule text-ink"
          >
            {current.icon}
          </button>
          <Menu open={menu === "view"} onClose={close} title="Show as" sheet={sheet}>
            <div role="radiogroup" aria-label="Show as">
              {VIEWS.map((v) => (
                <OptionRow
                  key={v.value}
                  kind="radio"
                  label={v.label}
                  hint={v.hint}
                  checked={view === v.value}
                  lead={<span className="text-ink-2">{v.icon}</span>}
                  onToggle={() => {
                    onView(v.value);
                    close();
                  }}
                />
              ))}
            </div>
            {/* Classic always opens the page. */}
            {view !== "classic" && (
              <div role="radiogroup" aria-label="When you tap a face" className="mt-2 border-t border-rule pt-2">
                <p className="eyebrow px-4 pt-2 pb-1">When you tap a face</p>
                {TAPS.map((t) => (
                  <OptionRow key={t.value} kind="radio" label={t.label} hint={t.hint} checked={tap === t.value} onToggle={() => setTap(t.value)} />
                ))}
              </div>
            )}
          </Menu>
        </div>
      </div>

      {/* Phones: facets and order as a scrolling row of pills. */}
      <div className="scroll-row flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
        {facets.map((f) => (
          <FacetButton key={f.key} small label={f.label} picked={f.picked} open={menu === f.key} onClick={() => openMenu(f.key)} />
        ))}
        <BarButton small open={menu === "order"} onClick={() => openMenu("order")}>
          {orderLabel}
        </BarButton>
        {sheet && orderMenu}
      </div>

      {tokens.length > 0 && (
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 pb-2 sm:px-8">
          <span className="shrink-0 text-[0.8rem] text-muted tabular-nums" aria-live="polite">
            <span className="font-semibold text-ink">{shown}</span> of {total}
          </span>
          {/* Wraps instead of scrolling: a scroll box would clip a chip flying in from a detail page. */}
          <ul aria-label="Active filters" className="flex min-w-0 flex-1 flex-wrap gap-1.5 py-1.5">
            {tokens.map((t) => (
              <li key={tokenKey(t)} className="max-w-full min-w-0">
                <ActiveChip t={t} arrived={arrivedKey === tokenKey(t)} onRemove={() => onChange(withoutToken(filters, t))} />
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded-full px-1 py-2 text-[0.8rem] font-medium text-accent hover:underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

/** Seventeen traditions: a find box keeps the list short. */
function TraditionOptions({ filters, set }: { filters: Filters; set: (patch: Partial<Filters>) => void }) {
  const [q, setQ] = useState("");
  const matches = useMemo(() => TRADITIONS.filter((t) => fold(t).includes(fold(q.trim()))), [q]);
  return (
    <>
      <div className="sticky top-0 z-10 bg-[var(--sheet)] px-3 pt-1.5 pb-2">
        <label className="relative block">
          <span className="sr-only">Find a tradition</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a tradition"
            autoComplete="off"
            className="h-10 w-full rounded-xl bg-paper-2 pr-3 pl-9 text-base text-ink sm:text-[0.9rem] placeholder:text-muted focus:outline-none"
          />
        </label>
      </div>
      {matches.map((t) => (
        <OptionRow
          key={t}
          label={t}
          checked={filters.traditions.includes(t)}
          onToggle={() => set({ traditions: toggle(filters.traditions, t) })}
          count={COUNT.get(tokenKey({ group: "tradition", value: t }))}
        />
      ))}
      {matches.length === 0 && <p className="px-4 py-3 text-[0.85rem] text-muted">No tradition by that name.</p>}
    </>
  );
}

function FacetButton({
  label,
  picked,
  open,
  onClick,
  small,
}: {
  label: string;
  picked: string[];
  open: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  const on = picked.length > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={on ? `${label}: ${picked.join(", ")}` : label}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full whitespace-nowrap transition-colors ${
        small ? "h-9 pr-2.5 pl-3.5 text-[0.85rem]" : "h-11 pr-3 pl-4 text-[0.875rem]"
      } ${on ? "bg-ink font-semibold text-paper" : `border ${open ? "border-ink text-ink" : "border-rule text-ink-2 hover:text-ink"}`}`}
    >
      {on && <span className="font-medium opacity-60">{label}</span>}
      <span className="max-w-[11rem] truncate">{on ? (picked.length === 1 ? picked[0] : picked.length) : label}</span>
      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

function BarButton({ open, onClick, small, children }: { open: boolean; onClick: () => void; small?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-haspopup="dialog"
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border whitespace-nowrap transition-colors ${
        small ? "h-9 pr-2.5 pl-3.5 text-[0.85rem]" : "h-11 pr-3 pl-4 text-[0.875rem]"
      } ${open ? "border-ink text-ink" : "border-rule text-ink-2 hover:text-ink"}`}
    >
      {children}
      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

/** Publishes the bar's height as --bar-h, so sticky section headers sit below it. */
function useBarHeight(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--bar-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
}

/**
 * A selected filter, pinned in the bar. When it was just tapped on a detail page, it shares that
 * chip's layoutId and flies in; once landed it lets the id go, so later reflows of the page under
 * this sticky bar can't set it drifting.
 */
function ActiveChip({ t, arrived, onRemove }: { t: FilterToken; arrived: boolean; onRemove: () => void }) {
  const [flying, setFlying] = useState(arrived);
  return (
    <m.button
      type="button"
      layoutId={flying ? filterChipId(t) : undefined}
      transition={{ layout: morph }}
      onLayoutAnimationComplete={() => setFlying(false)}
      onClick={onRemove}
      aria-label={`Remove filter: ${GROUP_LABELS[t.group]} ${t.value}`}
      className="relative inline-flex h-9 max-w-full items-center gap-1.5 rounded-full bg-ink pr-2.5 pl-3.5 text-[0.8rem] whitespace-nowrap text-paper"
    >
      {arrived && (
        <m.span
          aria-hidden
          className="pointer-events-none absolute -inset-[3px] rounded-full border-2 border-accent"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 1.1, duration: 0.9 }}
        />
      )}
      {/* `layout` keeps the label from stretching while the chip changes size mid-flight. */}
      <m.span layout={flying ? "position" : false} className="inline-flex min-w-0 items-center gap-1.5">
        <span className="shrink-0 text-paper/60">{GROUP_LABELS[t.group]}</span>
        <span className="truncate font-medium">{t.value}</span>
        <Close className="h-3.5 w-3.5 shrink-0 opacity-80" />
      </m.span>
    </m.button>
  );
}
