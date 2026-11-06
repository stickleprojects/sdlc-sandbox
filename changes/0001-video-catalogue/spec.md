# Spec: Video catalogue on the home page

Intent: ./intent.md

## Summary

The home page (`/`) lists every video in a seed list kept in the repo as a grid of cards, ordered alphabetically by title. Each card shows title, thumbnail, duration and short description, and links to a placeholder detail page at `/videos/<id>`. The same catalogue is served as JSON at `/api/videos`. The seed list has at least 6 made-up videos with generated or placeholder thumbnails served by the app. No sign-in, no new runtime dependencies.

## Requirements

- R1. `GET /` returns 200 HTML containing one card per seed video, and no longer contains "Nothing to watch yet."
- R2. Each card shows the video's title, a thumbnail `<img>` (with alt text), its duration and its description.
- R3. The seed list lives in the repo as a data module and contains at least 6 videos, each with a unique URL-safe `id`, `title`, `description`, `durationSeconds` (positive integer) and `thumbnail` path.
- R4. Cards are ordered alphabetically by title (case-insensitive) on the home page and in the JSON.
- R5. The page uses a CSS grid of cards and a viewport meta tag so it is usable at phone width (no horizontal scrolling at 360px width; the grid collapses to one column).
- R6. Each card links to `GET /videos/<id>`, which returns 200 HTML showing that video's title, thumbnail, duration and description, and a note that playback is coming soon.
- R7. `GET /videos/<id>` for an id not in the catalogue (including malformed ids) returns a 404 response, and the id is never echoed unescaped in the response.
- R8. `GET /api/videos` returns 200 `application/json` with an array of the catalogue videos in the same order as the page, with the fields in R3.
- R9. Thumbnail images are served by the app from the repo (`GET <thumbnail path>` returns 200 with an image content type), and paths outside the thumbnail directory are never served (no path traversal).
- R10. Catalogue, detail and JSON routes require no authentication.
- R11. All text from seed data is HTML-escaped when rendered.
- R12. Existing `/health` behaviour and the 404 JSON for unknown routes are unchanged.
- R13. No runtime dependencies are added.

## Acceptance criteria

- A1 (R1, R2, R4, R11): a test fetches `/` and checks status 200, that every seed title, duration and description appears, that each has an `<img>`, that the placeholder text is absent, and that titles appear in alphabetical order.
- A2 (R3): a test checks the seed list has ≥ 6 entries, unique ids matching `^[a-z0-9-]+$`, non-empty fields and positive integer durations.
- A3 (R5): a test checks the HTML contains a viewport meta tag and grid CSS with a single-column rule for narrow screens.
- A4 (R6): a test fetches `/videos/<id>` for each seed video and checks 200, its details and the "coming soon" note; the home page contains a link to each.
- A5 (R7): a test fetches `/videos/does-not-exist` and `/videos/<script>` and checks 404 with no unescaped input echoed.
- A6 (R8): a test fetches `/api/videos` and checks 200, JSON content type, the same ids in the same order as the page, and the R3 fields.
- A7 (R9): a test fetches each thumbnail path and checks 200 and an `image/*` content type; `/thumbnails/../src/server.ts` and an encoded variant do not return file contents.
- A8 (R10): all of the above run without any credentials or auth headers.
- A9 (R12, R13): existing `/health` test passes; `package.json` has no `dependencies`.
- A10: `make check` exits 0 and ends with `ok: N change(s) valid`.

## Policy concerns

Security policy (`security-policy`):
- Input validation at the boundary: the `id` in `/videos/<id>` and the thumbnail path are external input. Covered by R7 and R9 (lookup against the known list only; no filesystem path built from raw input).
- Dependencies: none added (R13), so no justification or pinning is needed.
- Personal data: none collected or stored; seed data must be made up (R3, intent constraints). No retention concern.
- Secrets: none involved.
- Enforcement gap: all these rules are advisory skills; no hook or CI check enforces them. Only tests A5, A7 and A9 cover them for this change.

No conflicts between policies found.

## Out of scope

Video playback, uploading or editing videos, accounts and sign-in, search, filtering, pagination, and any persistent storage (the catalogue is a static seed list).

## Open questions

None. The intent's open questions were resolved on 2026-11-06. Routes chosen here (`/videos/<id>`, `/api/videos`, thumbnail directory) were not named in the intent; the product owner can ask for different addresses.
