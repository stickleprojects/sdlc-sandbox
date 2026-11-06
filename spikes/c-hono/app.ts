// Option C: Hono on Node via @hono/node-server.
import type { Server } from "node:http";
import { fileURLToPath } from "node:url";
import { createAdaptorServer } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { findVideo, listVideos } from "../shared/catalogue.ts";
import { renderDetail, renderHome } from "../shared/html.ts";

const root = fileURLToPath(new URL("../shared/public", import.meta.url));

export const createServer = (): Server => {
  const app = new Hono();
  app.get("/health", (c) => c.json({ status: "ok" }));
  app.get("/", (c) => c.html(renderHome(listVideos())));
  app.get("/videos/:id{[a-z0-9-]+}", (c) => {
    const v = findVideo(c.req.param("id"));
    return v ? c.html(renderDetail(v)) : c.notFound();
  });
  app.get("/api/v1/videos", (c) => c.json(listVideos()));
  app.use("/thumbnails/*", serveStatic({ root }));
  // Hono only sends Accept-Ranges on range requests; Safari wants it on the first 200 to allow seeking.
  app.use("/media/*", serveStatic({ root, onFound: (_p, c) => c.header("Accept-Ranges", "bytes") }));
  app.use(
    "/hls/*",
    serveStatic({
      root,
      // Hono's MIME table has no .m3u8 entry, so set it and the caching policy here.
      onFound: (path, c) => {
        if (path.endsWith(".m3u8")) {
          c.header("Content-Type", "application/vnd.apple.mpegurl");
          c.header("Cache-Control", "public, max-age=5");
        } else {
          c.header("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );
  app.notFound((c) => c.json({ error: "not found" }, 404));
  return createAdaptorServer({ fetch: app.fetch }) as Server;
};
