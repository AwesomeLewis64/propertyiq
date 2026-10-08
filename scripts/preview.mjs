import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("dist");
const port = Number(process.env.PORT ?? 4197);
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".csv": "text/csv",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xml": "application/xml",
  ".txt": "text/plain",
};
const headers = {};
for (const line of (await readFile(resolve(root, "_headers"), "utf8")).split(
  "\n",
)) {
  const match = line.match(/^\s+([^:]+):\s*(.+)$/);
  if (match) headers[match[1]] = match[2];
}
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://127.0.0.1").pathname,
    );
    const path = resolve(root, "." + pathname);
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    const file = (await stat(path)).isDirectory()
      ? resolve(path, "index.html")
      : path;
    res.writeHead(200, {
      ...headers,
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`PropertyIQ CSP preview: http://127.0.0.1:${port}`),
);
