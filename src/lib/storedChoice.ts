import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * A small choice remembered on this device and shared by every component that reads it.
 * Starts at `fallback` so prerendered HTML and the first client render agree, then switches to the
 * saved value after mount. `onApply` runs whenever the value changes (e.g. to mirror it on <html>).
 */
export function storedChoice<T extends string>(key: string, values: readonly T[], fallback: T, onApply?: (v: T) => void) {
  const listeners = new Set<() => void>();
  let current = fallback;

  const stored = (): T => {
    try {
      const v = localStorage.getItem(key) as T | null;
      return v && values.includes(v) ? v : fallback;
    } catch {
      return fallback;
    }
  };
  const apply = (v: T) => {
    current = v;
    onApply?.(v);
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };

  return function useChoice(): [T, (v: T) => void] {
    const value = useSyncExternalStore(subscribe, () => current, () => fallback);
    useEffect(() => {
      const saved = stored();
      if (saved !== current) apply(saved);
    }, []);
    const choose = useCallback((v: T) => {
      apply(v);
      try {
        localStorage.setItem(key, v);
      } catch {
        /* storage unavailable: the choice lasts for this visit */
      }
    }, []);
    return [value, choose];
  };
}
