import { useEffect, useState } from "react";

/** False until mounted, so prerendered HTML and the first client render agree. */
export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatches(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return matches;
}
