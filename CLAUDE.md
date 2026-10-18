# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

StreamLite is a lightweight video streaming service. It is the practice product for the [claude-sdlc](https://github.com/stickleprojects/claude-sdlc) pipeline: every feature moves through intent.md → spec.md → plan.md → code → PR under `changes/NNNN-name/`. `docs/roles.md` says who does what.

## Commands

```
make setup       # npm ci + the pipeline CLI (uv)
make check       # lint (Biome + tsc) + tests + artifact chain; must exit 0 before a PR
make test        # node --test 'test/**/*.test.ts'
node --test test/server.test.ts      # a single test file
node --test --test-name-pattern="health" 'test/**/*.test.ts'   # a single test by name
make run         # start the app on $PORT (default 3000)
make new-change NAME=<kebab-name>    # start a change
make status      # stage each change has reached
make sync-sdlc   # pull the latest pipeline from claude-sdlc main (REF=<ref> for another)
```

A healthy `make check` ends with `ok: N change(s) valid`.

## Stack

- TypeScript on Node ≥ 22.18. Node runs `.ts` files directly (type stripping), so there's no build step. Use only erasable syntax: no `enum`, no `namespace`, no parameter properties. Import local files with their `.ts` extension.
- No runtime dependencies so far. Adding one needs a stated reason in the spec (see the security-policy skill).
- `tsc` only type-checks (`noEmit`). Biome lints and formats.

## What belongs to whom

- **Framework-owned** (overwritten by `make sync-sdlc`; change them upstream in claude-sdlc): `.claude/agents|hooks|skills|settings.json`, `.github/workflows/`, `scripts/agent.sh`, `scripts/bootstrap-github.sh`, `templates/`, `prompts/`, `evals/run.sh`, `REVIEW.md`, `docs/roles.md`, `tools/sdlc/src/`. `.sdlc-version` records the framework commit.
- **This repo**: the app (`src/`, `test/`), `Makefile`, `.github/actions/setup-stack/`, `CLAUDE.md`, `readme.md`, `evals/tasks/`, `changes/`.

## Guardrails

The hooks in `.claude/settings.json` block edits to hooks, settings, lockfiles and `.env*`; block deploys to production, pushes to main and force pushes; and format each edited file through `make fmt FILES=...`. With `SDLC_LOCK_TESTS=1`, files under `tests/` are locked (note: this repo's tests live in `test/`, which the framework hook doesn't cover yet).
