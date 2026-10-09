import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

// public/theme.js owns the initial value and system changes; this only flips it.
const subscribe = (notify: () => void) => {
  window.addEventListener("propertyiq:theme", notify);
  return () => window.removeEventListener("propertyiq:theme", notify);
};
const isDark = () => document.documentElement.dataset.theme === "dark";

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="theme-toggle"
      onClick={() => {
        const next = dark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("propertyiq:theme", next);
        } catch {
          /* The choice still applies for this page view. */
        }
        window.dispatchEvent(new Event("propertyiq:theme"));
      }}
    >
      <Sun className="theme-toggle-sun" aria-hidden="true" />
      <Moon className="theme-toggle-moon" aria-hidden="true" />
      <span className="theme-toggle-knob" aria-hidden="true">
        {dark ? <Moon /> : <Sun />}
      </span>
    </button>
  );
}
