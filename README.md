# API Diff

OpenAPI **3.0** contract compatibility analyzer.

A developer changes a REST API. API Diff compares the old and new OpenAPI specifications and reports what changed and whether it may break existing clients.

It analyzes the **API contract only**. It does not read application source code.

## Current status

**Phase 4 — endpoint / method comparison.**

The engine can tell which operations were added or removed. It does not yet classify breaking vs non-breaking, and it does not yet compare parameters or schemas.

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
