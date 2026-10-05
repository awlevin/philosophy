import { useTheme } from "../lib/theme";
import { Moon, Sun } from "./Icons";

export function ThemeToggle() {
  const { toggle } = useTheme();
  // Icons are switched in CSS so prerendered HTML is right before hydration.
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light or dark mode"
      title="Toggle light or dark mode"
      className="grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:bg-chip hover:text-ink"
    >
      <Sun className="theme-dark-only" />
      <Moon className="theme-light-only" />
    </button>
  );
}
