# API Diff

OpenAPI **3.0** contract compatibility analyzer.

A developer changes a REST API. API Diff compares the old and new OpenAPI specifications and reports what changed and whether it may break existing clients.

It analyzes the **API contract only**. It does not read application source code.

## Current status

**Phase 8 — compatibility rules.**

`compareSpecs(old, new)` returns a classified report: breaking / non-breaking / warning, each with a `ruleId` and explanation.

## Workspace

```text
packages/engine    core TypeScript engine (build this first)
apps/api           Express — Phase 10
apps/web           React — Phase 11
apps/cli           optional — Phase 13
```

## Commands

```bash
pnpm install
pnpm --filter @apidiff/engine test
```
