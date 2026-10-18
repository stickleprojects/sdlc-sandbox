#!/usr/bin/env bash
# Pull the pipeline from the claude-sdlc framework repo into this repo.
#
# Usage: scripts/sync-sdlc.sh [ref]     (ref = branch, tag or SHA; default: main)
#        make sync-sdlc REF=v0.2
#
# Copies only the paths the framework owns (FRAMEWORK_PATHS below), overwriting local
# copies, then records the exact commit in .sdlc-version. Everything else (the app,
# Makefile, setup-stack action, CLAUDE.md, readme, CODEOWNERS, evals/tasks) belongs
# to this repo and is never touched. Review the result and commit it in a PR.
set -euo pipefail

FRAMEWORK_REPO="${SDLC_REPO:-stickleprojects/claude-sdlc}"
ref="${1:-main}"

# framework path -> path in this repo
FRAMEWORK_PATHS=(
  ".claude/agents:.claude/agents"
  ".claude/hooks:.claude/hooks"
  ".claude/skills:.claude/skills"
  ".claude/settings.json:.claude/settings.json"
  ".github/workflows:.github/workflows"
  "scripts/agent.sh:scripts/agent.sh"
  "scripts/bootstrap-github.sh:scripts/bootstrap-github.sh"
  "templates:templates"
  "prompts:prompts"
  "evals/run.sh:evals/run.sh"
  "REVIEW.md:REVIEW.md"
  "docs/roles.md:docs/roles.md"
  "src/sdlc:tools/sdlc/src/sdlc"
)

cd "$(git rev-parse --show-toplevel)"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "working tree has uncommitted changes; commit or stash them first" >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
echo "fetching $FRAMEWORK_REPO@$ref ..."
gh repo clone "$FRAMEWORK_REPO" "$tmp/fw" -- --quiet --depth 1 --branch "$ref" 2>/dev/null \
  || { gh repo clone "$FRAMEWORK_REPO" "$tmp/fw" -- --quiet && git -C "$tmp/fw" checkout --quiet "$ref"; }
sha="$(git -C "$tmp/fw" rev-parse HEAD)"

for pair in "${FRAMEWORK_PATHS[@]}"; do
  src="$tmp/fw/${pair%%:*}" dst="${pair#*:}"
  [[ -e "$src" ]] || { echo "  skip (not in framework): ${pair%%:*}"; continue; }
  rm -rf -- "$dst"
  mkdir -p "$(dirname "$dst")"
  cp -r "$src" "$dst"
done
find tools/sdlc/src -name __pycache__ -prune -exec rm -rf {} +

printf '%s\n%s\n' "$FRAMEWORK_REPO@$ref" "$sha" > .sdlc-version

# Git loses the executable bit on some filesystems (NTFS); set it in the index.
git add -A
git ls-files '*.sh' | xargs -r git update-index --chmod=+x

if git diff --cached --quiet; then
  echo "already up to date with $FRAMEWORK_REPO@$ref (${sha:0:7})"
  exit 0
fi
echo
git diff --cached --stat
echo
echo "Synced to $FRAMEWORK_REPO@$ref (${sha:0:7}). Changes are staged. Next:"
echo "  make check"
echo "  git switch -c chore/sync-sdlc-${sha:0:7} && git commit -m 'chore: sync pipeline from claude-sdlc ${sha:0:7}'"
echo "  git push -u origin HEAD && gh pr create --fill"
