import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { createApp } from "../src/server.ts";

const app = createApp();
let base = "";

before(async () => {
  await new Promise<void>((resolve) => app.listen(0, resolve));
  base = `http://localhost:${(app.address() as AddressInfo).port}`;
});

after(() => app.close());

test("GET /health reports ok", async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok" });
});

test("GET / serves the home page", async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /StreamLite/);
});

test("unknown paths return 404", async () => {
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
});
