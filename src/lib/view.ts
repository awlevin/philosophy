import { useCallback, useEffect, useSyncExternalStore } from "react";

/** Faces and List use the era palette; Classic is the original flat, sepia gallery. */
export type ViewMode = "faces" | "list" | "classic";

const STORAGE_KEY = "view";
const listeners = new Set<() => void>();
let current: ViewMode = "faces";

function stored(): ViewMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "list" || v === "classic" ? v : "faces";
  } catch {
    return "faces";
  }
}

function apply(v: ViewMode) {
  current = v;
  // The look is page-wide (gallery and detail pages), so it lives on <html>, like the theme.
  if (v === "classic") document.documentElement.dataset.look = "classic";
  else delete document.documentElement.dataset.look;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/**
 * The gallery view, remembered on this device and shared by every component. Starts as "faces"
 * so prerendered HTML and the first client render agree, then switches to the saved choice.
 */
export function useViewMode(): [ViewMode, (v: ViewMode) => void] {
  const view = useSyncExternalStore(subscribe, () => current, () => "faces" as const);
  useEffect(() => {
    const saved = stored();
    if (saved !== current) apply(saved);
  }, []);
  const choose = useCallback((v: ViewMode) => {
    apply(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* storage unavailable: choice lasts for this visit */
    }
  }, []);
  return [view, choose];
}
