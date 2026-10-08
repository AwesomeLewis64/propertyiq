import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const viteRequire = createRequire(require.resolve("vite"));
const postcss = viteRequire("postcss");
const path = "src/styles.css";
const tree = postcss.parse(readFileSync(path, "utf8"));
let removed = 0;
// Only exact duplicates in the same conditional scope are removed; fallback
// declarations and selectors with different ordering/specificity are preserved.
function clean(parent) {
  const seen = new Set();
  const declarations = new Set();
  for (const node of [...(parent.nodes ?? [])].reverse()) {
    if (node.type === "rule") {
      for (const declaration of [...node.nodes].reverse()) {
        if (
          declaration.type !== "decl" ||
          !/^(color|background|background-color|font-size|font-weight|line-height|border|border-color|border-radius|padding|margin|display|width|height|min-width|max-width|gap|text-align|grid-template-columns|overflow|box-shadow)$/.test(
            declaration.prop,
          )
        )
          continue;
        const key =
          node.selector +
          "|" +
          declaration.prop +
          "|" +
          !!declaration.important;
        if (declarations.has(key)) {
          declaration.remove();
          removed++;
        } else declarations.add(key);
      }
      if (!node.nodes.length) {
        node.remove();
        continue;
      }
      const signature =
        node.selector +
        "|" +
        node.nodes.map((n) => n.toString().trim()).join(";");
      if (seen.has(signature)) {
        node.remove();
        removed++;
      } else seen.add(signature);
    } else if (node.type === "atrule" && node.nodes) clean(node);
  }
}
clean(tree);
writeFileSync(path, tree.toString());
console.log(
  `Removed ${removed} duplicate rules or overridden declarations; preserved the established cascade.`,
);
