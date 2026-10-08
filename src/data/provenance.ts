export type Origin = "example" | "user" | "unknown";
export function originOf(p: {
  origin?: Origin;
  name?: string;
  id?: string;
}): Origin {
  if (p.origin) return p.origin;
  // Legacy examples can be recognized by their source name/id, not their figures.
  if (
    p.id === "maple-grove-shared" ||
    /fictional|maple grove/i.test(p.name ?? "")
  )
    return "example";
  return "unknown";
}
export function provenance(p: {
  origin?: Origin;
  name?: string;
  id?: string;
}): string {
  const origin = originOf(p);
  return origin === "example"
    ? "Origin: fictional example; edits and copies retain this origin. Figures are illustrative, not verified property information."
    : origin === "user"
      ? "Origin: user-entered assumptions; source information has not been independently verified."
      : "Origin: legacy project of unknown provenance; verify its source information.";
}
