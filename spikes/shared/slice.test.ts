// One suite for every spike: SPIKE=b-router|c-hono node --test spikes/shared/slice.test.ts
import assert from "node:assert/strict";
import { request } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { listVideos } from "./catalogue.ts";
import { formatDuration } from "./html.ts";

const spike = process.env.SPIKE ?? "b-router";
const { createServer } = (await import(`../${spike}/app.ts`)) as { createServer: () => Server };
const app = createServer();
let base = "";
let port = 0;
before(async () => {
  await new Promise<void>((r) => app.listen(0, r));
  port = (app.address() as AddressInfo).port;
  base = `http://localhost:${port}`;
});
after(() => app.close());

// Raw request: fetch normalises "..", which would hide traversal bugs.
const raw = (path: string) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = request({ port, path, method: "GET" }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.end();
  });

test("home: every video, escaped, in title order, as a grid", async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.doesNotMatch(html, /Nothing to watch yet/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /display:grid/);
  assert.match(html, /@media \(max-width:480px\)\{\.grid\{grid-template-columns:1fr\}\}/);
  assert.match(html, /Bread &amp; &lt;Butter&gt; Basics/);
  assert.doesNotMatch(html, /<Butter>/);
  let last = -1;
  for (const v of listVideos()) {
    const at = html.indexOf(`href="/videos/${v.id}"`);
    assert.ok(at > last, `${v.id} out of order`);
    last = at;
    assert.ok(html.includes(formatDuration(v.durationSeconds)));
    assert.ok(html.includes(`src="${v.thumbnail}"`));
  }
});

test("detail page for each video, 404 for unknown or malformed ids", async () => {
  for (const v of listVideos()) {
    const res = await fetch(`${base}/videos/${v.id}`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /coming soon/);
  }
  for (const p of ["/videos/does-not-exist", "/videos/%3Cscript%3E", "/videos/a/b"]) {
    const res = await fetch(`${base}${p}`);
    assert.equal(res.status, 404, p);
    const body = await res.text();
    assert.doesNotMatch(body, /<script>|does-not-exist/);
  }
});

test("versioned JSON API in page order", async () => {
  const res = await fetch(`${base}/api/v1/videos`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /^application\/json/);
  const data = (await res.json()) as { id: string }[];
  assert.deepEqual(
    data.map((v) => v.id),
    listVideos().map((v) => v.id),
  );
});

test("thumbnails served; traversal attempts never leak files", async () => {
  for (const v of listVideos()) {
    const res = await fetch(`${base}${v.thumbnail}`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /^image\/svg\+xml/);
    await res.arrayBuffer();
  }
  for (const p of [
    "/thumbnails/../app.ts",
    "/thumbnails/..%2fapp.ts",
    "/thumbnails/%2e%2e/%2e%2e/shared/catalogue.ts",
    "/thumbnails/..%5c..%5cshared%5ccatalogue.ts",
    "/thumbnails/%252e%252e/%252e%252e/shared/catalogue.ts",
    "/thumbnails//etc/passwd",
  ]) {
    const { status, body } = await raw(p);
    assert.notEqual(status, 200, p);
    assert.doesNotMatch(body, /SEED_VIDEOS|createServer|root:/, p);
  }
});

test("web playback: MP4 byte ranges", async () => {
  const full = await fetch(`${base}/media/sample.mp4`);
  assert.equal(full.status, 200);
  assert.equal(full.headers.get("accept-ranges"), "bytes");
  assert.equal((await full.arrayBuffer()).byteLength, 65536);

  const first = await fetch(`${base}/media/sample.mp4`, { headers: { range: "bytes=0-99" } });
  assert.equal(first.status, 206);
  assert.equal(first.headers.get("content-range"), "bytes 0-99/65536");
  const a = new Uint8Array(await first.arrayBuffer());
  assert.equal(a.length, 100);
  assert.equal(a[99], 99);

  const tail = await fetch(`${base}/media/sample.mp4`, { headers: { range: "bytes=-10" } });
  assert.equal(tail.status, 206);
  assert.equal(tail.headers.get("content-range"), "bytes 65526-65535/65536");
  assert.equal(new Uint8Array(await tail.arrayBuffer())[0], 65526 % 251);

  const open = await fetch(`${base}/media/sample.mp4`, { headers: { range: "bytes=65000-" } });
  assert.equal(open.status, 206);
  assert.equal((await open.arrayBuffer()).byteLength, 536);

  const bad = await fetch(`${base}/media/sample.mp4`, { headers: { range: "bytes=70000-" } });
  assert.equal(bad.status, 416);
  assert.equal(bad.headers.get("content-range"), "bytes */65536");
  await bad.arrayBuffer();
});

test("native playback: HLS playlist and segments with types and caching", async () => {
  const pl = await fetch(`${base}/hls/index.m3u8`);
  assert.equal(pl.status, 200);
  assert.match(pl.headers.get("content-type") ?? "", /^application\/vnd\.apple\.mpegurl/);
  assert.match(pl.headers.get("cache-control") ?? "", /max-age=\d+/);
  assert.match(await pl.text(), /^#EXTM3U/);
  const seg = await fetch(`${base}/hls/seg0.ts`);
  assert.equal(seg.status, 200);
  assert.match(seg.headers.get("content-type") ?? "", /^video\/mp2t/);
  assert.match(seg.headers.get("cache-control") ?? "", /immutable/);
  assert.equal((await seg.arrayBuffer()).byteLength, 1880);
});

test("unknown routes are JSON 404s", async () => {
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), { error: "not found" });
});
