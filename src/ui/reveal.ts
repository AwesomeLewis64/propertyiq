// One shared observer for entrance motion. Any element with [data-reveal] gets
// [data-shown] the first time it scrolls into view; CSS does the animating.
// Content stays visible unless <html> has .js-motion, so a failed script or
// reduced motion never hides anything.
export function startReveals() {
  if (
    typeof IntersectionObserver === "undefined" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  const seen = new WeakSet<Element>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries)
        if (e.isIntersecting) {
          e.target.setAttribute("data-shown", "");
          io.unobserve(e.target);
        }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
  );
  const scan = () =>
    document
      .querySelectorAll("[data-reveal]:not([data-shown])")
      .forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
  scan();
  new MutationObserver(scan).observe(document.body, {
    childList: true,
    subtree: true,
  });
  document.documentElement.classList.add("js-motion");
}
