// Sets the theme before first paint. A file, not inline, because the CSP is script-src 'self'.
(function () {
  var root = document.documentElement;
  var media = matchMedia("(prefers-color-scheme: dark)");
  function saved() {
    try {
      return localStorage.getItem("propertyiq:theme");
    } catch (e) {
      return null;
    }
  }
  function apply() {
    var choice = saved();
    root.dataset.theme =
      choice === "dark" || choice === "light"
        ? choice
        : media.matches
          ? "dark"
          : "light";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta)
      meta.content = root.dataset.theme === "dark" ? "#0a0d13" : "#f5f6f8";
    window.dispatchEvent(new Event("propertyiq:theme"));
  }
  apply();
  media.addEventListener("change", apply);
})();
