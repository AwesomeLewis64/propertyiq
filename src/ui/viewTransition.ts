import { flushSync } from "react-dom";

/**
 * Crossfades between screens with the View Transitions API. Falls back to an
 * instant update where unsupported or when reduced motion is requested.
 * Resolves once the new screen is in the DOM.
 */
export function swap(update: () => void): Promise<void> {
  if (
    !document.startViewTransition ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    update();
    return Promise.resolve();
  }
  return document.startViewTransition(() => flushSync(update))
    .updateCallbackDone;
}
