export const money = (v: number | null | undefined, digits = 0) =>
  v == null || !Number.isFinite(v)
    ? "N/A"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v);
export const pct = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? "N/A" : `${(v * 100).toFixed(2)}%`;
export const multiple = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? "N/A" : `${v.toFixed(2)}x`;
export const compact = (v: number) => `$${(v / 1000).toFixed(0)}k`;
