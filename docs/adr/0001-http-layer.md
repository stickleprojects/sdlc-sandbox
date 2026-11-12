# ADR 0001: How StreamLite builds its HTTP layer

<!-- An architecture decision record. Kept at docs/adr/NNNN-<slug>.md, numbered in order; it
belongs to this repo and the framework sync never touches it. The tech lead or architect owns it
(docs/roles.md). /plan reads every ADR before proposing a plan and checks each accepted one's
"Revisit when" triggers, so a decision that builds up over several changes gets raised. Don't edit
an accepted decision away: write a new ADR and mark this one "superseded by NNNN". -->

## Status

accepted (Kieron, 2026-11-06)

Raised by: the plan for change 0001 (video catalogue), 2026-11-06. Owner: Kieron (tech lead).

## Context

**What raised it.** The skeleton server (`src/server.ts`) already routes requests by hand on `node:http`. Change 0001 adds a catalogue page, a detail page per video, a JSON endpoint and thumbnail serving. Planning it meant hand-building routing, static file serving and HTML templating a second time. A widely used framework provides all three, so `/plan`'s architecture check stopped and asked.

**What the app needs, now and next.**

| When | Feature | What the HTTP layer must do |
|---|---|---|
| Now (0001) | Catalogue, detail page, JSON, thumbnails | Route by method and path with one parameter; render escaped HTML; serve JSON; serve a fixed set of static files safely |
| Next | Playback | **Native apps use HLS:** a playlist (`.m3u8`) and pre-cut segments, served as static files with the right content types and caching headers. **The web uses MP4 with byte ranges** (`Range`, 206, `Content-Range`, 416) |
| Later | Uploads | Parse multipart bodies with size limits |
| Later | Accounts | Cookies, sessions, CSRF protection, per-route middleware (auth) |
| Required | Native apps (iOS and Android) | A stable, versioned JSON API that is the source of truth for every client; token-based auth alongside web cookies; streaming formats that native players support |

**Constraints.**
- **No runtime dependencies so far.** Adding one needs a stated reason in the spec (CLAUDE.md, security policy). Spec 0001's R13 says none are added, so choosing a framework means amending that spec first.
- **Node ≥ 22.18 runs `.ts` directly** (type stripping). There's no build step, code must use erasable syntax only, and local imports keep their `.ts` extension. A framework needing a compiler, decorators or a bundler would break this.
- **Tooling:** Biome lints and formats, `tsc` only type-checks, and tests run with `node --test` against a server on an ephemeral port.
- **Purpose:** StreamLite is the practice product for the claude-sdlc pipeline. Keeping it small and easy to read is a goal. So is looking like a real service, so lessons carry over.

**Forces, in priority order** (draft; the tech lead may reorder):

1. **Security defaults:** path traversal, escaping, header handling.
2. **Project health and maturity.** Avoid both ends:
   - **Too new or fragile:** cutting edge, pre-1.0 or churning APIs, a single maintainer (bus factor of 1), little production use.
   - **Too old:** no longer maintained, with no releases, unanswered security issues and stale Node support.

   Measured per option:
   - age and major version;
   - date of the last release and release cadence over the past 12 months;
   - number of active maintainers or committers, and whether a foundation or company stands behind it;
   - how security advisories have been handled (time to fix);
   - weekly downloads, as a rough proxy for production use;
   - whether it supports the current Node LTS lines.

   For B, the in-repo option, the maintainer is us: the cost shows up as code we own, not as project risk.
3. **Dependency footprint and supply-chain risk:** direct and transitive packages, install size, `npm audit`.
4. **Fit for what's next:** a JSON API that native apps and the web share, byte-range playback, multipart uploads, cookies, sessions, token auth and auth middleware.
5. **Readability and learning value.**
6. **How easy it is to undo.**
7. **Performance.** Unlikely to decide anything at this scale.

**Dependency budget.** No fixed limit. Any number of dependencies is acceptable with a good reason, stated in the spec that adds them (security policy). The footprint is still measured and weighed under force 3.

**Hard fails.** An option that meets any of these is rejected, whatever else it offers:

- It needs a build step, or can't run `.ts` directly through Node's type stripping.
- It has had no release in the past 18 months.
- It has a single maintainer and no backing organisation. *Single maintainer* means one person actively maintaining the code (reviewing, fixing, releasing fixes). Publish rights held by one person are a risk to watch (see Revisit when), not a hard fail. The tech lead clarified this on 2026-11-06, when deciding this ADR.

**Out of scope.** The UI and client approach is a separate decision. Native apps are required, so it's needed soon, as **ADR 0002**, after this one is accepted. It covers:

- React Native (Expo) or fully native apps;
- whether the web shares code with the apps;
- server-rendered HTML or React on the web.

This ADR only has to keep those options open. See [React and native clients](#react-and-native-clients) under Alternatives considered.

## Decision

**StreamLite's HTTP layer uses Hono (`hono` and `@hono/node-server`), with exact pinned versions.** Two parts stay our own:

- **Static and media files** (thumbnails, MP4, HLS) are served by our own allowlist handler, not by Hono's `serveStatic`. The allowlist is built at startup from the media folders, and requests are looked up by raw path, so no filesystem path is ever built from request input. Byte ranges come either from a small shared helper, or from Hono's range code once a review confirms it doesn't touch path handling. The plan for each change decides which.
- **HTML rendering** stays as escaped template strings for now. Hono's JSX is not adopted; the UI approach belongs to ADR 0002.

JSON APIs live under a versioned prefix (`/api/v1`), mounted with `app.route()`, because native apps depend on it.

## Alternatives considered

Options under consideration:

- **A. Plain `node:http`, as today.** Reference point; no spike.
- **B. A small in-repo router and helpers module, no dependencies.** Spiked.
- **C. Hono, with `@hono/node-server`.** Spiked.
- **D. Fastify.** Researched only.
- **E. Express.** Researched only.

### How the spikes were run

B and C each built the same slice on the throwaway branch [`spike/0001-http-layer`](https://github.com/stickleprojects/sdlc-sandbox/tree/spike/0001-http-layer/spikes). The slice:

- the catalogue grid;
- the detail page, with 404s for unknown and malformed ids;
- `/api/v1/videos`;
- thumbnails;
- web MP4 with byte ranges;
- a native HLS playlist and segments.

Both share the seed data and HTML rendering, so the figures cover only the HTTP layer. Both pass the same 7-test suite. That includes six path-traversal probes (`..`, `%2f`, `%2e%2e`, `%5c`, double-encoded, `//`) and five range cases (full, `0-99`, `-10`, `65000-`, and an unsatisfiable range giving 416). Data is as of 2026-11-06, from npm, GitHub and `npm audit`.

### Comparison

| | B. In-repo router | C. Hono | D. Fastify | E. Express |
|---|---|---|---|---|
| **Hard fail: build step, or no `.ts` through type stripping** | Passes | Passes (`tsc` strict, erasable-only, clean) | Passes (JS with bundled types) | Passes (types from `@types/express`) |
| **Hard fail: no release in 18 months** | n/a | Passes: 69 releases in 12 months, latest 2026-11-01 | Passes: 34, latest 2026-11-02 | Passes: 7, latest 2026-10-09 |
| **Hard fail: single maintainer, no backing organisation** | n/a: we maintain it | **Borderline**: 15 contributors with ≥ 10 commits, but **one npm publisher** (the creator) for `hono` and `@hono/node-server`, and no foundation | Passes: 5 publishers, 41 contributors with ≥ 10 commits, OpenJS Foundation | Passes: 5 publishers, OpenJS Foundation |
| **Our HTTP-layer code for the slice** | 127 lines (router, helpers, ranges, static allowlist) | 36 lines | Not spiked (expected to be close to C) | Not spiked (expected to be close to C) |
| **Runtime packages / install size** | 0 / 0 | 2 packages, no transitive dependencies / 3.1 MB | 70 with `@fastify/static` / 23 MB | 65 / 3.9 MB |
| **`npm audit`** | n/a | 0 | 0 | 0 |
| **Maturity** | New: ours | 5 years old, v4, ~100 M downloads a week, fast-moving | 10 years old, v5, ~22 M a week | 16 years old, v5, ~196 M a week, slow release cadence |
| **Security record (published advisories)** | None, but no outside review either | Frequent and fixed quickly, but **recurring in static serving** (5 path or middleware bypasses in `serveStatic` across 2026) and others in `csrf`, `jsx` escaping and the body parser | Several highs in 2026 (validation and auth bypasses), all fixed | Few, the last in 2024 |
| **Path traversal (our probes)** | Not possible by design: an allowlist built at startup, no path built from input | Blocked: decodes, then rejects `..`, `\`, `//` and `%`. It builds a file path from input, which is where its past bypasses came from | Not tested | Not tested |
| **Byte ranges** | We wrote them: about 25 lines, single range only | Built in. Needed one fix: `Accept-Ranges` is sent only on range requests, and Safari wants it on the first 200 | Built in (`@fastify/static`) | Built in (`send`) |
| **HLS** | Extension map plus a cache policy, 4 lines | Needed a hook: **no `.m3u8` in Hono's MIME table** | Supported by `@fastify/static` options | Supported by `serve-static` options |
| **What's next (sessions, CSRF, multipart, auth, API versioning)** | All built and secured by us | Middleware exists for all of them, and `app.route()` makes `/api/v1` easy. Runs on other runtimes too | The most complete plugin ecosystem, plus schema validation for the API | Large but older middleware ecosystem, weaker typing |
| **Readability and learning value** | Everything is visible, and all of it is ours to keep correct | Small, modern, web-standard `Request` and `Response` | More concepts (plugins, encapsulation, schemas) | Familiar, but an older style |
| **How easy it is to undo** | Easy to move off: the handlers are plain functions | Medium: handlers use Hono's `Context` | Harder: plugins and encapsulation run through the app | Medium |
| **Cold start (import)** | 165 ms | 201 ms | Not measured | Not measured |

### Pros and cons

- **A. Plain `node:http`, as today.**
  - *Pro:* no new concepts.
  - *Con:* routes as an `if` chain stop being readable at about 5 routes, and every helper gets written inline. Already outgrown by 0001. Rejected.
- **B. In-repo router.**
  - *Pro:* zero dependencies, so R13 holds.
  - *Pro:* the safest static serving of the options, because no path is built from input.
  - *Pro:* nothing hidden, and easy to undo.
  - *Con:* we own the correctness of every HTTP edge case. The spike showed this straight away: a routing bug mixed regex with the `:param` syntax, and range parsing needed care.
  - *Con:* sessions, CSRF, multipart and auth would all be hand-built, and each is security-sensitive.
- **C. Hono.**
  - *Pro:* the smallest code for us to write (36 lines against 127), and zero transitive dependencies.
  - *Pro:* modern, typed, web-standard APIs, built-in ranges, and middleware for everything that comes next.
  - *Con:* release rights rest with one person, a borderline case for our hard fail.
  - *Con:* static serving has a recurring advisory history.
  - *Con:* two small gaps (`.m3u8` MIME type, `Accept-Ranges`) needed hooks.
- **D. Fastify.**
  - *Pro:* the strongest governance and plugin ecosystem, and schema-validated JSON suits an API shared with native apps.
  - *Con:* the heaviest footprint by far (70 packages, 23 MB).
  - *Con:* a heavier mental model.
  - *Con:* a cluster of high-severity advisories in 2026.
- **E. Express.**
  - *Pro:* the most mature, with foundation-backed governance.
  - *Con:* 65 packages, an older API style and weaker typing.
  - *Con:* slow releases. They're steady rather than abandoned, so it passes the 18-month hard fail.

### React and native clients

- **None of these options needs or blocks React or React Native.** Native apps call the JSON API and play HLS, so they care about the API contract and the stream files, not the server framework.
- **React on the web** works with any option. It can render on the server with `react-dom/server` from any handler, or run as a client-side app served as static files. Hono's built-in JSX isn't React, and using it wouldn't rule React out later.
- **Whether to spike React** belongs in ADR 0002 (UI and client approach), not here.

## Consequences

- **Spec 0001 needs amending before its plan:** R13 says no runtime dependencies are added. A spec PR replaces it with "adds `hono` and `@hono/node-server`, pinned exactly, per ADR 0001", giving the reason the security policy requires.
- **Easier:**
  - Routing with parameters and constraints.
  - Mounting `/api/v1`.
  - Middleware for what's next: sessions and cookies, CSRF, body and multipart parsing, auth for web cookies and native tokens.
  - Testing through `app.request()` without a socket. The existing `node --test` style keeps working.
- **What we own:**
  - The static allowlist handler and its tests (traversal probes, ranges, HLS content types and caching).
  - The `.m3u8` content type and the `Accept-Ranges` header that Hono leaves out.
  - Exact version pins, and watching Hono's security advisories. Its 2026 record is frequent, fixed advisories, so upgrades are a regular chore.
- **Repo housekeeping:** media folders are excluded from `tsconfig.json` and Biome, because HLS segments use the `.ts` extension.
- **Undoing it:** handlers depend on Hono's `Context`. Keeping domain logic (catalogue, rendering) in plain modules, as the spike did, means moving off Hono would only change the routing layer.
- **Native apps and React:** unaffected. ADR 0002 decides the client approach.

## Revisit when

- A plan uses Hono's `serveStatic`, or builds a filesystem path from any part of the request.
- A plan hand-builds something a Hono middleware provides: cookies, sessions, CSRF, body or multipart parsing, CORS, auth, or a router.
- A plan adds a second HTTP framework, or needs a Node HTTP feature that `@hono/node-server` can't expose.
- `hono` or `@hono/node-server` goes 12 months without a release, announces maintenance mode, or loses its only npm publisher without a successor.
- A high or critical Hono advisory affects a feature we use.
- Two published `hono` or `@hono/node-server` advisories within 12 months affect the same module (for example `serveStatic`, `csrf`, `jsx`, the body parser) that a merged change uses.
- A plan adds request or response schema validation to 3 or more `/api/v1` routes (consider Hono's validator middleware, or Fastify).
