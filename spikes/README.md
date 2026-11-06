# Spikes for ADR 0001 (HTTP layer): throwaway, never merged

Same slice of change 0001 in each option, judged by one shared test suite.

```
node spikes/shared/make-fixtures.ts
(cd spikes/c-hono && npm ci)
SPIKE=b-router node --test spikes/shared/slice.test.ts
SPIKE=c-hono   node --test spikes/shared/slice.test.ts
```
