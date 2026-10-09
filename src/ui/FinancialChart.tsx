import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { BusyLabel } from "./LoadingFeedback";
import { money } from "./format";
import { csvText, download } from "../data/export";
import type { BridgeRow } from "../analytics/visuals";

export type ChartRow = { label: string; values: (number | null)[] };
const colors = [
  "var(--color-ink)",
  "var(--color-warning)",
  "var(--color-accent)",
  "var(--color-muted)",
];
const xml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function chartCsv(
  title: string,
  note: string,
  series: string[],
  rows: ChartRow[],
) {
  return csvText([
    [title],
    [note],
    ["Period / assumption", ...series],
    ...rows.map((r) => [r.label, ...r.values]),
  ]);
}
export default function FinancialChart({
  title,
  note,
  source = "",
  series,
  rows,
  bridge,
  unit = "money",
}: {
  title: string;
  note: string;
  source?: string;
  series: string[];
  rows: ChartRow[];
  bridge?: BridgeRow[];
  unit?: "money" | "points";
}) {
  const id = useId(),
    wrap = useRef<HTMLDivElement>(null),
    svg = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(640),
    [scale, setScale] = useState(1),
    [selected, setSelected] = useState(0),
    [error, setError] = useState(""),
    [exporting, setExporting] = useState<"svg" | "png" | null>(null);
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const actual = entries[0].contentRect.width;
      setWidth(Math.max(280, actual));
      // The SVG never draws narrower than 280; the glide overlay scales to match.
      setScale(actual > 0 ? Math.min(1, actual / 280) : 1);
    });
    if (wrap.current) observer.observe(wrap.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let opened: HTMLDetailsElement | null = null;
    const before = () => {
      const table = wrap.current
        ?.closest("section")
        ?.querySelector<HTMLDetailsElement>(".chart-data");
      if (table && !table.open) {
        table.open = true;
        opened = table;
      }
    };
    const after = () => {
      if (opened) {
        opened.open = false;
        opened = null;
      }
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  const active = Math.min(selected, Math.max(0, rows.length - 1));
  const format = (v: number | null) =>
    v === null || !Number.isFinite(v)
      ? "N/A"
      : unit === "points"
        ? `${v >= 0 ? "+" : ""}${v.toFixed(2)} pp`
        : money(v);
  const finite = rows.flatMap((r) =>
    r.values.filter((v): v is number => v !== null && Number.isFinite(v)),
  );
  const horizontal = !!bridge || unit === "points";
  const rangeValues = bridge
    ? bridge.flatMap((r) => [r.start, ...(r.end === null ? [] : [r.end])])
    : finite;
  const low = Math.min(0, ...rangeValues),
    high = Math.max(1, ...rangeValues),
    range = high - low;
  const left = horizontal ? Math.min(155, width * 0.43) : 65,
    right = width - 18;
  const height = horizontal ? rows.length * 48 + 55 : 255;
  const x = (v: number) => left + ((v - low) / range) * (right - left);
  const y = (v: number) => 205 - ((v - low) / range) * 175;
  const xp = (i: number) =>
    left + (i * (right - left)) / Math.max(1, rows.length - 1);
  // Line series as drawn, plus each point's distance along its path, so the
  // inspection dot can travel the line itself (CSS offset-path).
  const lines = series.map((_, j) => {
    let d = "",
      run = 0,
      prev: [number, number] | null = null;
    const along = rows.map((r, i) => {
      const v = r.values[j];
      if (v === null) {
        prev = null;
        return null;
      }
      const pt: [number, number] = [xp(i), y(v)];
      if (prev) run += Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
      d += `${prev ? "L" : "M"} ${pt[0]} ${pt[1]} `;
      prev = pt;
      return run;
    });
    return { d: d.trim(), along };
  });
  const svgId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  const trail =
    !horizontal && rows.length > 1 && rows.every((r) => r.values[0] !== null)
      ? `${lines[0].d} L ${xp(rows.length - 1)} ${y(0)} L ${xp(0)} ${y(0)} Z`
      : null;
  const stem = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-$/, " ")
    .trim();
  async function exportImage(kind: "svg" | "png") {
    if (exporting) return;
    setExporting(kind);
    try {
      setError("");
      await document.fonts.ready;
      const svgNode = svg.current;
      if (!svgNode) return;
      const clone = svgNode.cloneNode(true) as SVGSVGElement;
      // Downloads are always light: resolve tokens with the chart briefly in a
      // light subtree. Synchronous until removed below, so nothing repaints.
      const host = svgNode.parentElement!;
      host.dataset.theme = "light";
      // Resolve shared CSS tokens before serializing a standalone download.
      const theme = getComputedStyle(svgNode);
      const token = (name: string) => theme.getPropertyValue(name).trim();
      const exportColors = colors.map((color) => token(color.slice(4, -1)));
      const originals = [svgNode, ...svgNode.querySelectorAll("*")];
      const copies = [clone, ...clone.querySelectorAll("*")];
      originals.forEach((node, index) => {
        const computed = getComputedStyle(node);
        for (const attribute of [
          "fill",
          "stroke",
          "font-family",
          "font-size",
        ]) {
          const value = node.getAttribute(attribute);
          if (value?.includes("var("))
            copies[index].setAttribute(
              attribute,
              computed.getPropertyValue(attribute),
            );
        }
      });
      clone.querySelectorAll(".chart-cursor").forEach((n) => n.remove());
      clone.setAttribute("width", String(width));
      clone.setAttribute("height", String(height));
      const words = `${note} ${source}`.split(/\s+/),
        lines: string[] = [];
      let line = "";
      for (const word of words) {
        if ((line + word).length > Math.max(35, Math.floor(width / 7))) {
          lines.push(line);
          line = "";
        }
        line += word + " ";
      }
      if (line) lines.push(line);
      const legend = series
        .map(
          (s, i) =>
            `<text x="16" y="${height + 58 + i * 19}" fill="${exportColors[i % 4]}" font-size="${token("--text-12")}">${xml(s)}</text>`,
        )
        .join("");
      const foot = height + 70 + series.length * 19;
      const total = foot + lines.length * 18 + 20;
      const body = new XMLSerializer().serializeToString(clone);
      const text = `<svg xmlns="http://www.w3.org/2000/svg" font-family="${xml(token("--font-sans"))}" width="${width}" height="${total}" viewBox="0 0 ${width} ${total}"><rect width="100%" height="100%" fill="${token("--color-surface")}"/><text x="16" y="24" font-family="${xml(token("--font-sans"))}" font-size="${token("--text-16")}" font-weight="${token("--weight-semibold")}" fill="${token("--color-ink")}">${xml(title)}</text><g transform="translate(0 34)">${body}</g>${legend}${lines.map((s, i) => `<text x="16" y="${foot + i * 18}" font-family="${xml(token("--font-sans"))}" font-size="${token("--text-12")}" fill="${token("--color-text")}">${xml(s)}</text>`).join("")}</svg>`;
      delete host.dataset.theme;
      if (kind === "svg") {
        download(`${stem}.svg`, text, "image/svg+xml");
        return;
      }
      // Data URI works under the existing img-src policy without broadening it.
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(width * 2);
      canvas.height = Math.ceil(total * 2);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Image export is unavailable.");
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Image export failed."))),
          "image/png",
        ),
      );
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = `${stem}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chart export failed.");
    } finally {
      // Never leave the chart stuck in the light export theme after an error.
      delete svg.current?.parentElement?.dataset.theme;
      setExporting(null);
    }
  }
  if (!rows.length)
    return (
      <section className="panel financial-chart">
        <h2>{title}</h2>
        <p>Complete the assumptions to see this chart.</p>
      </section>
    );
  return (
    <section
      className="panel financial-chart"
      aria-labelledby={id}
      data-reveal=""
    >
      <div className="panel-title">
        <h2 id={id}>{title}</h2>
        <details className="chart-download no-print">
          <summary>Download</summary>
          <div>
            <button
              disabled={!!exporting}
              aria-busy={exporting === "png"}
              onClick={() => void exportImage("png")}
            >
              {exporting === "png" ? (
                <BusyLabel>Preparing PNG…</BusyLabel>
              ) : (
                "PNG image"
              )}
            </button>
            <button
              disabled={!!exporting}
              aria-busy={exporting === "svg"}
              onClick={() => void exportImage("svg")}
            >
              {exporting === "svg" ? (
                <BusyLabel>Preparing SVG…</BusyLabel>
              ) : (
                "SVG image"
              )}
            </button>
            <button
              onClick={() =>
                download(
                  `${stem}.csv`,
                  chartCsv(title, `${note} ${source}`, series, rows),
                )
              }
            >
              CSV data
            </button>
          </div>
        </details>
      </div>
      <p className="chart-note">{note}</p>
      {exporting && (
        <p className="chart-note" role="status">
          Preparing {exporting.toUpperCase()} download…
        </p>
      )}
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      <div className="chart-legend">
        {series.map((s, i) => (
          <span key={s} style={{ color: colors[i % 4] }}>
            {["━", "┄", "···", "╍"][i % 4]} {s}
          </span>
        ))}
      </div>
      <div ref={wrap} className="chart-canvas">
        <svg
          ref={svg}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${title}; inspect any period using the control or data table below.`}
          fontFamily="var(--font-sans)"
          fontSize="var(--text-12)"
          fill="var(--color-text)"
          onPointerMove={(e) => {
            if (e.buttons || e.pointerType === "mouse") {
              const rect = e.currentTarget.getBoundingClientRect();
              setSelected(
                Math.max(
                  0,
                  Math.min(
                    rows.length - 1,
                    Math.round(
                      horizontal
                        ? (((e.clientY - rect.top) * height) / rect.height -
                            20) /
                            48
                        : ((((e.clientX - rect.left) * width) / rect.width -
                            left) /
                            (right - left)) *
                            (rows.length - 1),
                    ),
                  ),
                ),
              );
            }
          }}
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setSelected(
              Math.max(
                0,
                Math.min(
                  rows.length - 1,
                  Math.round(
                    horizontal
                      ? (((e.clientY - rect.top) * height) / rect.height - 20) /
                          48
                      : ((((e.clientX - rect.left) * width) / rect.width -
                          left) /
                          (right - left)) *
                          (rows.length - 1),
                  ),
                ),
              ),
            );
          }}
        >
          <rect width={width} height={height} fill="var(--color-surface)" />
          {horizontal ? (
            <>
              <line
                x1={x(0)}
                x2={x(0)}
                y1={8}
                y2={height - 35}
                stroke="var(--color-border-strong)"
              />
              {rows.map((r, i) => (
                <g key={r.label}>
                  <text x={0} y={22 + i * 48} fontSize="var(--text-12)">
                    {r.label.length > 23 ? r.label.slice(0, 21) + "…" : r.label}
                  </text>
                  {r.values.map((v, j) => {
                    const b = bridge?.[i],
                      start = b?.start ?? 0,
                      end = b?.end ?? v;
                    return end === null || v === null ? (
                      <text key={j} x={left + 5} y={24 + i * 48 + j * 14}>
                        N/A
                      </text>
                    ) : (
                      <rect
                        key={j}
                        className="chart-bar"
                        style={{ "--i": i } as CSSProperties}
                        x={Math.min(x(start), x(end))}
                        y={12 + i * 48 + j * 14}
                        width={Math.max(1, Math.abs(x(end) - x(start)))}
                        height={bridge ? 22 : 12}
                        fill={b?.total ? colors[0] : colors[j % 4]}
                        opacity={b && !b.total && v < 0 ? 0.75 : 1}
                      />
                    );
                  })}
                  {bridge && (
                    <text x={left} y={46 + i * 48} fontSize="var(--text-12)">
                      {format(r.values[0])}
                    </text>
                  )}
                </g>
              ))}
              <text x={left} y={height - 8}>
                {format(low)}
              </text>
              <text x={right} y={height - 8} textAnchor="end">
                {format(high)}
              </text>
            </>
          ) : (
            <>
              {[0, 0.5, 1].map((t) => {
                const v = low + range * t;
                return (
                  <g key={t}>
                    <line
                      x1={left}
                      x2={right}
                      y1={y(v)}
                      y2={y(v)}
                      stroke="var(--color-border)"
                    />
                    <text x={0} y={y(v) + 4} fontSize="var(--text-12)">
                      {Math.abs(v) >= 1000000
                        ? `$${(v / 1000000).toFixed(1)}m`
                        : `$${(v / 1000).toFixed(0)}k`}
                    </text>
                  </g>
                );
              })}
              {/* Draw-in: the plot is uncovered left to right when the chart
                  first scrolls into view. The rect's own width is the final
                  state, so downloads are always complete. */}
              <defs>
                <clipPath id={`${svgId}-reveal`}>
                  <rect
                    className="chart-reveal"
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                  />
                </clipPath>
              </defs>
              <g clipPath={`url(#${svgId}-reveal)`}>
                {trail && (
                  <g className="chart-cursor">
                    <defs>
                      <linearGradient
                        id={`${svgId}-trail`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0"
                          stopColor="var(--color-accent)"
                          stopOpacity="0.16"
                        />
                        <stop
                          offset="1"
                          stopColor="var(--color-accent)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                      <clipPath id={`${svgId}-clip`}>
                        <rect
                          className="chart-trail-clip"
                          x={left}
                          y={0}
                          width={right - left}
                          height={height}
                          style={{
                            transform: `scaleX(${(xp(active) - left) / (right - left)})`,
                          }}
                        />
                      </clipPath>
                    </defs>
                    <path
                      className="chart-line"
                      d={trail}
                      fill={`url(#${svgId}-trail)`}
                      clipPath={`url(#${svgId}-clip)`}
                    />
                  </g>
                )}
                {series.map((s, j) => (
                  <path
                    // A new point count re-keys the path instead of morphing it.
                    key={`${s}-${rows.length}`}
                    className="chart-line"
                    d={lines[j].d}
                    stroke={colors[j % 4]}
                    strokeWidth="2.5"
                    strokeDasharray={
                      j % 4 === 1
                        ? "7 4"
                        : j % 4 === 2
                          ? "2 4"
                          : j % 4 === 3
                            ? "10 3 2 3"
                            : undefined
                    }
                    fill="none"
                  />
                ))}
              </g>
              <line
                className="chart-cursor"
                x1={0}
                x2={0}
                y1={25}
                y2={205}
                style={{ transform: `translateX(${xp(active)}px)` }}
                stroke="var(--color-muted)"
                strokeDasharray="3 3"
              />
              {[0, rows.length - 1].map((i, k) => (
                <text
                  key={k}
                  x={k ? right : left}
                  y={232}
                  textAnchor={k ? "end" : "start"}
                >
                  {rows[i].label}
                </text>
              ))}
            </>
          )}
        </svg>
        {!horizontal && (
          <div
            className="chart-glide no-print"
            aria-hidden="true"
            style={{ width, height, transform: `scale(${scale})` }}
          >
            {series.map((s, j) =>
              lines[j].along[active] === null ? null : (
                <span
                  key={s}
                  className="chart-glide-dot"
                  style={{
                    color: colors[j % 4],
                    offsetPath: `path("${lines[j].d}")`,
                    offsetDistance: `${lines[j].along[active]}px`,
                  }}
                >
                  {j === 0 && (
                    <span
                      className="chart-glide-tip"
                      // Near the top of the plot the label would cover the legend; drop it below.
                      data-below={
                        y(rows[active].values[0] ?? 0) < 60 ? "" : undefined
                      }
                      data-edge={
                        active === 0
                          ? "start"
                          : active === rows.length - 1
                            ? "end"
                            : undefined
                      }
                    >
                      {rows[active].label} · {format(rows[active].values[0])}
                    </span>
                  )}
                </span>
              ),
            )}
          </div>
        )}
      </div>
      <div className="chart-inspect no-print">
        <label>
          Inspect {horizontal ? "assumption / item" : "period"}
          <input
            aria-label={`Inspect ${title}`}
            type="range"
            min={0}
            max={rows.length - 1}
            value={active}
            onChange={(e) => setSelected(Number(e.target.value))}
          />
        </label>
        <output aria-live="polite">
          <strong>{rows[active].label}</strong>
          {series.map((s, i) => (
            <span key={s}>
              {s}: {format(rows[active].values[i])}
            </span>
          ))}
        </output>
      </div>
      <details className="chart-data">
        <summary>View chart data</summary>
        <div className="table-scroll" tabIndex={0}>
          <table>
            <caption>
              {title} · {unit === "points" ? "percentage points" : "USD"}
            </caption>
            <thead>
              <tr>
                <th scope="col">Period / item</th>
                {series.map((s) => (
                  <th scope="col" key={s}>
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  {r.values.map((v, i) => (
                    <td key={i}>{format(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
