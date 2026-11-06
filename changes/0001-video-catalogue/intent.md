# Intent: Video catalogue on the home page

<!-- Stage 1 (Plan). Drafted by Claude from the originator's brainstorm, corrected by the
originator, accepted by the product owner. Merging this file triggers spec generation. -->

Originator: Kieron
Product owner: Kieron

## Problem

StreamLite has nothing to watch. A visitor who opens the home page sees only "Nothing to watch yet.", with no way to find out what videos the service offers. Every later feature (playback, uploads, accounts) depends on there being a set of videos that viewers can see and choose from.

## Proposed outcome

- A visitor who opens `/` sees a catalogue of videos instead of the placeholder text.
- The catalogue lists every video in a fixed seed list kept in the repo (at least 6 videos to start).
- Each entry shows the video's title, a thumbnail image, its duration and a short description.
- The catalogue is laid out as a grid of cards, one card per video, and stays usable at phone width.
- Videos are ordered alphabetically by title.
- Clicking a card opens a placeholder detail page for that video, showing its catalogue details and a note that playback is coming soon. An address for a video that isn't in the catalogue returns a "not found" response.
- No sign-in is needed to view the catalogue.
- The same catalogue data is also available as JSON, so later features (and tests) can read it without scraping the page.

## Affected users and systems

- **Visitors**: anyone who opens the StreamLite home page.
- **StreamLite server** (`src/server.ts`): the home page changes, a detail page per video is added, and the catalogue data needs a home.
- **Seed data**: a new list of videos and their thumbnails, stored in the repo.

## Constraints

- No runtime dependencies (per CLAUDE.md); any exception needs a stated reason in the spec.
- Seed data must be made up: no real people's personal data, and thumbnails we have the right to use (generated or placeholder images).
- Out of scope for this change: playing videos, uploading or editing videos, accounts and sign-in, search, filtering and pagination.

## Open questions

None. Resolved with the originator on 2026-11-06: clicking a card opens a placeholder detail page; the catalogue is ordered by title; the layout is a grid of cards.
