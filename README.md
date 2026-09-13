# API Diff

OpenAPI **3.0** contract compatibility analyzer.

A developer changes a REST API. API Diff compares the old and new OpenAPI specifications and reports what changed and whether it may break existing clients.

It analyzes the **API contract only**. It does not read application source code.

## Current status

**Phase 5 — parameter comparison.**

The engine diffs endpoints/methods and parameters (added, removed, required vs optional). It does not yet classify breaking vs non-breaking, and it does not yet walk request/response schemas.

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
