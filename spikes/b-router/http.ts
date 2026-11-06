// Option B: a small zero-dependency HTTP toolkit on node:http.
import { createReadStream, readdirSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, relative, sep } from "node:path";

export type Params = Record<string, string>;
export type Handler = (req: IncomingMessage, res: ServerResponse, params: Params) => void | Promise<void>;
type Route = { method: string; re: RegExp; keys: string[]; handler: Handler };

export class Router {
  #routes: Route[] = [];
  get(pattern: string, handler: Handler): this {
    const keys: string[] = [];
    const src = pattern.replace(/:([a-zA-Z]+)/g, (_, k: string) => {
      keys.push(k);
      return "([a-z0-9-]+)";
    });
    this.#routes.push({ method: "GET", re: new RegExp(`^${src}$`), keys, handler });
    return this;
  }
  /** Every GET path under `prefix/`; the handler decides what exists. */
  prefix(prefix: string, handler: Handler): this {
    const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    this.#routes.push({ method: "GET", re: new RegExp(`^${esc}/`), keys: [], handler });
    return this;
  }
  handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    // Raw pathname, never decoded: encoded tricks simply fail to match.
    const path = new URL(req.url ?? "/", "http://x").pathname;
    for (const r of this.#routes) {
      if (r.method !== req.method) continue;
      const m = r.re.exec(path);
      if (m) return r.handler(req, res, Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1] ?? ""])));
    }
    notFound(res);
  };
}

export const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};
export const notFound = (res: ServerResponse): void => sendJson(res, 404, { error: "not found" });
export const sendHtml = (res: ServerResponse, html: string): void => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
};

const TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
};

/** Serves files under `dir` at `prefix`, from an allowlist built once: no path is built from input. */
export const staticFiles = (
  prefix: string,
  dir: string,
  cache: (file: string) => string | undefined = () => undefined,
): Handler => {
  const files = new Map<string, string>();
  for (const name of readdirSync(dir, { recursive: true, encoding: "utf8" })) {
    const abs = join(dir, name);
    if (statSync(abs).isFile()) files.set(`${prefix}/${relative(dir, abs).split(sep).join("/")}`, abs);
  }
  return (req, res) => {
    const abs = files.get(new URL(req.url ?? "/", "http://x").pathname);
    if (!abs) return notFound(res);
    const size = statSync(abs).size;
    const headers: Record<string, string | number> = {
      "content-type": TYPES[extname(abs)] ?? "application/octet-stream",
      "accept-ranges": "bytes",
    };
    const cc = cache(abs);
    if (cc) headers["cache-control"] = cc;
    const range = req.headers.range;
    if (!range) {
      res.writeHead(200, { ...headers, "content-length": size });
      createReadStream(abs).pipe(res);
      return;
    }
    const r = parseRange(range, size);
    if (!r) {
      res.writeHead(416, { ...headers, "content-range": `bytes */${size}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      ...headers,
      "content-length": r.end - r.start + 1,
      "content-range": `bytes ${r.start}-${r.end}/${size}`,
    });
    createReadStream(abs, r).pipe(res);
  };
};

/** One byte range (RFC 9110 14.1.2): "a-b", "a-" or "-n". Multiple ranges are refused. */
export const parseRange = (header: string, size: number): { start: number; end: number } | undefined => {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return undefined;
  let start: number;
  let end: number;
  if (m[1] === "") {
    const n = Number(m[2]);
    if (n === 0) return undefined;
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  return start <= end && start < size ? { start, end } : undefined;
};
