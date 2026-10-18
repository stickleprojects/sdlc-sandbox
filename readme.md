# StreamLite

A lightweight video streaming service: think a very small YouTube or Netflix.

This repo is where we **practise and prove** the [claude-sdlc](https://github.com/stickleprojects/claude-sdlc) pipeline. Every feature starts as an intent and moves through the playbook loop, with people deciding at each gate:

```
intent.md ─► spec.md ─► plan.md ─► code + tests ─► PR + AI review ─► release
```

Who does what: [docs/roles.md](docs/roles.md).

## Status

Skeleton only: a Node server with `/health` and a placeholder home page. Features such as the catalogue, playback and accounts will arrive as changes under `changes/`.

## Getting started

Prerequisites: `git`, `gh` (logged in), `make`, `jq`, `uv`, Node ≥ 22.18, and Claude Code with a Pro or Max plan.

```
make setup && make check            # must end with "ok: N change(s) valid"
make run                            # http://localhost:3000
scripts/bootstrap-github.sh         # one-time GitHub setup (see claude-sdlc's readme)
```

`bootstrap-github.sh` prints two manual steps: install the Claude GitHub app on this repo, and run `claude` here once to trust the workspace.

## Starting a feature

In Claude Code:

```
claude
> /intent Viewers want to browse a catalogue of videos
```

Claude asks about the problem and drafts `changes/0001-…/intent.md`. Open a PR; when the product owner merges it, the spec is generated automatically.

## Keeping the pipeline up to date

The pipeline lives in [claude-sdlc](https://github.com/stickleprojects/claude-sdlc). This repo holds a copy of it, at the version recorded in `.sdlc-version`.

```
make sync-sdlc              # pull the framework's main
make sync-sdlc REF=<ref>    # or a branch, tag or commit
```

It overwrites only the framework-owned files (listed in `scripts/sync-sdlc.sh` and `CLAUDE.md`), stages the changes, and prints the commands to open a PR. Run `make check` before committing.
