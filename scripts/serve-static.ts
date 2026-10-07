import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";

const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".avif": "image/avif",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".json": "application/json",
  ".map": "application/json",
};

/** Serves a built site on a free local port, with Vercel's clean URLs and its fallback to "/". */
export function serveStatic(dir: string): Promise<{ url: string; server: Server }> {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const candidates = [url, `${url}.html`, path.join(url, "index.html")];
    const file = candidates.map((c) => path.join(dir, c)).find((f) => existsSync(f) && statSync(f).isFile()) ?? path.join(dir, "index.html");
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream", "cache-control": "max-age=3600" });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve({ url: `http://127.0.0.1:${(server.address() as { port: number }).port}`, server })),
  );
}
