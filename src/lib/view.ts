import { useCallback, useEffect, useState } from "react";

export type ViewMode = "faces" | "list";

const STORAGE_KEY = "view";

/**
 * Faces or list, remembered on this device. Starts as "faces" so prerendered HTML and the first
 * client render agree, then switches to the saved choice after mount.
 */
export function useViewMode(): [ViewMode, (v: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>("faces");
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "list") setView("list");
    } catch {
      /* storage unavailable: default view */
    }
  }, []);
  const choose = useCallback((v: ViewMode) => {
    setView(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* storage unavailable: choice lasts for this visit */
    }
  }, []);
  return [view, choose];
}
