import { createServer as createHttpServer, type Server } from "node:http";
import { fileURLToPath } from "node:url";
import { findVideo, listVideos } from "../shared/catalogue.ts";
import { renderDetail, renderHome } from "../shared/html.ts";
import { notFound, Router, sendHtml, sendJson, staticFiles } from "./http.ts";

const pub = (d: string) => fileURLToPath(new URL(`../shared/public/${d}`, import.meta.url));
const hlsCache = (f: string) =>
  f.endsWith(".m3u8") ? "public, max-age=5" : "public, max-age=31536000, immutable";

export const createServer = (): Server => {
  const router = new Router()
    .get("/health", (_q, res) => sendJson(res, 200, { status: "ok" }))
    .get("/", (_q, res) => sendHtml(res, renderHome(listVideos())))
    .get("/videos/:id", (_q, res, p) => {
      const v = findVideo(p.id ?? "");
      return v ? sendHtml(res, renderDetail(v)) : notFound(res);
    })
    .get("/api/v1/videos", (_q, res) => sendJson(res, 200, listVideos()))
    .prefix("/thumbnails", staticFiles("/thumbnails", pub("thumbnails")))
    .prefix("/media", staticFiles("/media", pub("media")))
    .prefix("/hls", staticFiles("/hls", pub("hls"), hlsCache));
  return createHttpServer((req, res) => {
    router.handle(req, res).catch(() => sendJson(res, 500, { error: "internal" }));
  });
};
