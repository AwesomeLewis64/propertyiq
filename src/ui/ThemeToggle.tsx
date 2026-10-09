import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";

// public/theme.js owns the initial value and system changes; this only flips it.
const subscribe = (notify: () => void) => {
  window.addEventListener("propertyiq:theme", notify);
  return () => window.removeEventListener("propertyiq:theme", notify);
};
const isDark = () => document.documentElement.dataset.theme === "dark";
// Rapid toggles skip earlier transitions; keep the class until the last one ends.
let revealing = 0;

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
      onClick={(e) => {
        const root = document.documentElement;
        const next = dark ? "light" : "dark";
        const apply = () => {
          root.dataset.theme = next;
          try {
            localStorage.setItem("propertyiq:theme", next);
          } catch {
            /* The choice still applies for this page view. */
          }
          flushSync(() => window.dispatchEvent(new Event("propertyiq:theme")));
        };
        if (
          !document.startViewTransition ||
          matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return apply();
        // The new theme grows as a circle from the switch to the farthest corner.
        const box = e.currentTarget.getBoundingClientRect();
        const x = box.left + box.width / 2,
          y = box.top + box.height / 2;
        root.style.setProperty("--reveal-x", `${x}px`);
        root.style.setProperty("--reveal-y", `${y}px`);
        root.style.setProperty(
          "--reveal-r",
          `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 2}px`,
        );
        root.classList.add("theme-reveal");
        revealing++;
        document.startViewTransition(apply).finished.finally(() => {
          if (--revealing === 0) root.classList.remove("theme-reveal");
        });
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
