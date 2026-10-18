# The stack contract (same targets as claude-sdlc). Hooks, CI and evals call ONLY these
# targets. This repo's stack is TypeScript on Node 22: no build step, because Node runs
# .ts directly. The pipeline CLI is the Python copy in tools/sdlc, run via uv.
#
#   setup     install toolchain dependencies
#   fmt       format code; FILES=... limits it to specific files (used by the edit hook)
#   lint      static checks, no changes (Biome + tsc)
#   test      run the test suite (node --test)
#   validate  check the intent -> spec -> plan artifact chain
#   check     everything CI requires; exits non-zero on any failure
#   new-change start a change: make new-change NAME=add-catalogue
#   status    show the stage each change has reached
#   run       start the app on $PORT (default 3000)
#   sync-sdlc pull the latest pipeline from claude-sdlc (REF=main by default)

.PHONY: setup fmt lint test validate check exec-bits new-change status run sync-sdlc evals

SDLC = uv run --project tools/sdlc sdlc

# --- current stack: TypeScript on Node ---------------------------------------------
TS_FILES = $(filter %.ts %.js %.json,$(FILES))

setup:
	npm ci
	uv sync --project tools/sdlc

fmt:
ifdef FILES
	@$(if $(TS_FILES),npx biome check --write $(TS_FILES),true)
else
	npx biome check --write .
endif

lint:
	npx biome check .
	npx tsc

test:
	node --test 'test/**/*.test.ts'

run:
	node src/server.ts
# ----------------------------------------------------------------------------------

validate:
	$(SDLC) check

check: lint test validate exec-bits

# Committed scripts must be executable; a non-executable hook is skipped silently.
exec-bits:
	@bad=$$(git ls-files -s '*.sh' | awk '$$1 != "100755" {print $$4}'); \
	test -z "$$bad" || { echo "not executable in git (git update-index --chmod=+x):"; echo "$$bad"; exit 1; }

new-change:
	@test -n "$(NAME)" || { echo "usage: make new-change NAME=kebab-name"; exit 2; }
	$(SDLC) new $(NAME)

status:
	@$(SDLC) status

sync-sdlc:
	scripts/sync-sdlc.sh $(REF)

evals:
	./evals/run.sh
