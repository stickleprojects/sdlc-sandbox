# The stack contract (same targets as claude-sdlc). Hooks, CI and evals call ONLY these
# targets. This repo's stack is TypeScript on Node 22: no build step, because Node runs
# .ts directly. The pipeline's own targets (new-change, status, next, clauses, exec-bits,
# evals, sync-sdlc) come from .sdlc/sdlc.mk, whose tool needs only python3.
#
#   setup     install toolchain dependencies
#   fmt       format code; FILES=... limits it to specific files (used by the edit hook)
#   lint      static checks, no changes (Biome + tsc)
#   test      run the test suite (node --test)
#   validate  check the intent -> spec -> plan artifact chain
#   check     everything CI requires; exits non-zero on any failure
#   run       start the app on $PORT (default 3000)

.PHONY: setup fmt lint test validate check run

include .sdlc/sdlc.mk

# --- current stack: TypeScript on Node ---------------------------------------------
TS_FILES = $(filter %.ts %.js %.json,$(FILES))

setup:
	npm ci

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
