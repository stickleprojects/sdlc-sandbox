// StreamLite: a lightweight video streaming service.
// Skeleton only. Features arrive as changes through the pipeline (changes/NNNN-*/).
import { createServer, type Server } from "node:http";

export function createApp(): Server {
  return createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(
        "<!doctype html><title>StreamLite</title><h1>StreamLite</h1><p>Nothing to watch yet.</p>",
      );
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => console.log(`StreamLite on http://localhost:${port}`));
}
