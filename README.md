# API Diff

OpenAPI **3.0** contract compatibility analyzer.

A developer changes a REST API. That change may be necessary. They may not realize it can break existing clients. API Diff compares the **old** and **new** OpenAPI specifications and reports:

- what changed
- where
- whether it is **breaking**, **non-breaking**, or a **warning**
- why that classification was chosen

It analyzes the **API contract only**. It does not read application source code, and it does not decide what the product should do.

This is a portfolio project: a small, explainable pipeline rather than a wrap of [oasdiff](https://github.com/oasdiff/oasdiff) or similar tools.

## Quick start

Node 20+ and [pnpm](https://pnpm.io/) 9.

```bash
pnpm install
```

Two terminals:

```bash
pnpm dev:api    # Express on http://localhost:3001
pnpm dev:web    # UI on http://localhost:5173  (proxies /api → :3001)
```

Open the UI, click **Load example**, then **Compare**. The example removes `name` from `GET /users/{id}` and should report one **breaking** change: `schema.property.removed.response`.

```bash
pnpm test
pnpm lint
```

`pnpm test` runs the engine golden tests and the Express API tests. `pnpm lint` typechecks engine, API, and web.

## Pipeline

Everything else is a consumer of one function:

```ts
compareSpecs(oldSpec: string, newSpec: string) →
  { ok: true, report } | { ok: false, error }
```

```text
Old OpenAPI ──┐
              │    packages/engine  (pure TypeScript)
New OpenAPI ──┴──► parse YAML/JSON
                   → validate OpenAPI 3.0.x (fail closed, name old vs new)
                   → normalize (Maps, path signatures, JSON media only)
                   → structural facts (added / removed / modified)
                   → rule table (first match wins)
                   → report (summary + classified changes)
                              │
              ┌───────────────┼───────────────┐
         Express API       React UI        CLI / CI (later)
```

Facts do not carry severity. The walker records *what happened*. The rule catalog decides *whether it is safe for existing clients*. That split is the design you should be able to draw on a whiteboard.

Request vs response is inverted on purpose:

| Direction | Removing a property | Adding a required property |
|---|---|---|
| **Response** (server → client) | breaking — clients may still read it | usually non-breaking — extra fields are ignored |
| **Request** (client → server) | warning — old clients may still send it | breaking — old clients will not send it |

## Workspace

```text
packages/engine    compareSpecs() + fixtures + golden tests
apps/api           Express POST /api/compare
apps/web           React UI
```

## HTTP API

`POST http://localhost:3001/api/compare`

```json
{ "oldSpec": "... OpenAPI 3.0 YAML or JSON ...", "newSpec": "..." }
```

| Status | Body |
|---|---|
| 200 | Classified `report` |
| 400 | `{ "error": "INVALID_SPEC", "target": "old" \| "new", "details": [...] }` |
| 400 | `{ "error": "INVALID_REQUEST", "message": "..." }` |

`GET /health` → `{ "ok": true, "service": "api-diff" }`.

Body limit is 2mb. The server is stateless: no database, no auth, no sessions.

## What the MVP covers

**In**

- YAML and JSON
- OpenAPI 3.0.x only
- `get | post | put | patch | delete`
- path, query, and header parameters (path params match by **position** when names differ)
- `application/json` request bodies and responses
- schemas: `type`, `properties`, `required`, `items`, `enum`, nested objects
- internal `$ref` (`#/components/...`) with cycle-safe resolution
- explicit rule table + structured report
- fixture-driven golden tests (`expected.json`)

**Out**

- OpenAPI 3.1 and Swagger 2.0
- external `$ref` / multi-file specs
- cookie params, callbacks, webhooks, links, security schemes
- deep `allOf` / `oneOf` / `anyOf` / discriminator (emits a warning)
- non-JSON media types (noted, then ignored)
- path-rename heuristics (`/users` vs `/people` is two operations, not a rename)
- wrapping an existing diff library
- CLI and a CI compatibility gate (optional later phases)

## Compatibility rules

First matching rule in [`packages/engine/src/rules/catalog.ts`](packages/engine/src/rules/catalog.ts) wins. Unmatched facts fall through to `unclassified` (warning).

| Rule id | Severity |
|---|---|
| `endpoint.added` | non-breaking |
| `endpoint.removed` | breaking |
| `method.added` | non-breaking |
| `method.removed` | breaking |
| `parameter.added.required` | breaking |
| `parameter.added.optional` | non-breaking |
| `parameter.removed` | warning |
| `parameter.required.increased` | breaking |
| `parameter.required.decreased` | non-breaking |
| `parameter.name.changed` | warning |
| `requestBody.added.required` | breaking |
| `requestBody.added.optional` | non-breaking |
| `requestBody.removed` | warning |
| `requestBody.required.increased` | breaking |
| `requestBody.required.decreased` | non-breaking |
| `response.status.removed.success` | breaking |
| `response.status.removed.other` | warning |
| `response.status.added.success` | warning |
| `response.status.added.other` | non-breaking |
| `schema.property.removed.response` | breaking |
| `schema.property.removed.request` | warning |
| `schema.property.added.request.required` | breaking |
| `schema.property.added.request.optional` | non-breaking |
| `schema.property.added.response` | non-breaking |
| `schema.type.changed` | breaking |
| `schema.required.added.request` | breaking |
| `schema.required.removed.request` | non-breaking |
| `schema.required.added.response` | non-breaking |
| `schema.required.removed.response` | non-breaking |
| `schema.enum.removed.request` | breaking |
| `schema.enum.added.request` | non-breaking |
| `schema.enum.added.response` | warning |
| `schema.enum.removed.response` | warning |
| `schema.composition.changed` | warning |
| `schema.ref.unresolved` | warning |
| `unclassified` | warning |

A **warning** is “needs a human.” Example: removing a query parameter is often ignored by servers, but it can still be a client bug. Enum values added on a **response** can break exhaustive client switches.

## Tests

Golden fixtures live in [`packages/engine/testdata/fixtures/`](packages/engine/testdata/fixtures/). Each folder is `old.yaml` / `new.yaml` (or JSON) plus `expected.json`.

The hero case is [`removed-response-property`](packages/engine/testdata/fixtures/removed-response-property/).

Engine tests also cover invalid YAML/JSON, OpenAPI 3.1, Swagger 2.0, and external `$ref`. API tests hit `POST /api/compare` with supertest.

To regenerate goldens after an intentional report-shape change:

```bash
pnpm --filter @apidiff/engine generate:expected
```

## Interview talking points

- **Do not compare raw YAML.** Formatting, key order, and `$ref` vs inlined schemas are not contract changes. Normalize first.
- **Path signatures.** `/users/{id}` and `/users/{userId}` are the same operation (`GET /users/{}`). Path parameters then match by position.
- **Maps and Sets.** Operations are keyed by `METHOD + pathSignature`. Diff is set difference plus field comparison, not nested loops over arrays.
- **`$ref` cycles.** Resolution uses a visited set so `Node.neighbor → Node` cannot recurse forever.
- **Facts vs rules.** Comparison emits `ChangeFact`. Classification is a table. You can change severity without rewriting the walker.
- **Request/response inversion.** That table above is the core idea.
- **Fail closed.** Invalid specs never produce a partial report. Errors name `old` or `new`.
- **Stateless engine.** Express is an adapter. The same function can later power a CLI (`exit 1` on breaking) without a database.

## License

Private portfolio work unless you add a license later.
