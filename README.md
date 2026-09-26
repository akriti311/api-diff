# API Diff

OpenAPI **3.0** contract compatibility analyzer.

API Diff compares an **old** and a **new** OpenAPI specification and reports what changed, where it changed, and whether that change is **breaking**, **non-breaking**, or a **warning** — with the rule that produced the classification.

It analyzes the **API contract only**. It does not read application source code, and it does not decide whether a change should ship.

This is a portfolio project: a small, explainable pipeline rather than a wrap of [oasdiff](https://github.com/oasdiff/oasdiff) or similar tools.

**Live demo:** [https://api-diff-81hj.onrender.com](https://api-diff-81hj.onrender.com/) — click **Load example**, then **Compare**. The first visit after idle can take about a minute (Render free tier).

## Run locally

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

Or compare two spec files with the CLI (no server):

```bash
pnpm compare -- packages/engine/testdata/fixtures/removed-response-property/old.yaml packages/engine/testdata/fixtures/removed-response-property/new.yaml
pnpm compare -- --json packages/engine/testdata/fixtures/removed-response-property/old.yaml packages/engine/testdata/fixtures/removed-response-property/new.yaml
```

Exit codes: `0` no breaking changes, `1` at least one breaking change, `2` usage error, missing file, or invalid spec. `--json` prints the same classified report as JSON. `--fail-on-warning` also exits `1` when the report has warnings.

The HTTP API is `POST http://localhost:3001/api/compare`:

```json
{ "oldSpec": "... OpenAPI 3.0 YAML or JSON ...", "newSpec": "..." }
```

| Status | Body |
|---|---|
| 200 | Classified `report` |
| 400 | `{ "error": "INVALID_SPEC", "target": "old" \| "new", "details": [...] }` |
| 400 | `{ "error": "INVALID_REQUEST", "message": "..." }` |

`GET /health` → `{ "ok": true, "service": "api-diff" }`. Body limit is 2 MB. The server is stateless: no database, no auth, no sessions.

## Tests

```bash
pnpm test
pnpm lint
```

`pnpm test` runs the engine golden tests, Express API tests, and CLI tests. `pnpm lint` typechecks engine, API, web, and CLI.

Golden fixtures live in [`packages/engine/testdata/fixtures/`](packages/engine/testdata/fixtures/). Each folder is `old.yaml` / `new.yaml` (or JSON) plus `expected.json`. The hero case is [`removed-response-property`](packages/engine/testdata/fixtures/removed-response-property/).

Engine tests also cover invalid YAML/JSON, OpenAPI 3.1, Swagger 2.0, and external `$ref` (all rejected). API tests hit `POST /api/compare` with supertest. CLI tests check exit codes against the same fixtures.

To regenerate goldens after an intentional report-shape change:

```bash
pnpm --filter @apidiff/engine generate:expected
```

## Pipeline

The UI, HTTP API, and CLI all call one function:

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
         Express API       React UI          CLI
```

Facts do not carry severity. The walker records *what happened*. The rule catalog decides *whether it is safe for existing clients*.

Request vs response is inverted on purpose:

| Direction | Removing a property | Adding a required property |
|---|---|---|
| **Response** (server → client) | breaking — clients may still read it | usually non-breaking — extra fields are ignored |
| **Request** (client → server) | warning — old clients may still send it | breaking — old clients will not send it |

```text
packages/engine    compareSpecs() + fixtures + golden tests
apps/api           Express POST /api/compare
apps/web           React UI
apps/cli           apidiff <old-spec> <new-spec>
```

## Breaking changes

A change is **breaking** when an existing client, written against the old contract, can fail against the new one. The MVP flags, among others:

- removed endpoints or HTTP methods
- a new required parameter, or an optional parameter becoming required
- a required JSON request body added, or an optional body becoming required
- a success response status removed
- a response JSON property removed, or a required request JSON property added
- a schema `type` change
- a request enum value removed

**Warnings** need a human. Examples: removing a query parameter (servers often ignore extras, but clients may still send it) and adding enum values on a **response** (exhaustive client switches can break).

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

## MVP scope

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
- Express `POST /api/compare`, a React UI, and a CLI

**Out**

- OpenAPI 3.1 and Swagger 2.0
- external `$ref` / multi-file specs
- cookie params, callbacks, webhooks, links, security schemes
- deep `allOf` / `oneOf` / `anyOf` / discriminator (emits a warning)
- non-JSON media types (noted, then ignored)
- path-rename heuristics (`/users` vs `/people` is two operations, not a rename)
- wrapping an existing diff library
- a CI compatibility gate

## Design notes

- **Do not compare raw YAML.** Formatting, key order, and `$ref` vs inlined schemas are not contract changes. Normalize first.
- **Path signatures.** `/users/{id}` and `/users/{userId}` are the same operation (`GET /users/{}`). Path parameters then match by position.
- **Maps and Sets.** Operations are keyed by `METHOD + pathSignature`. Diff is set difference plus field comparison, not nested loops over arrays.
- **`$ref` cycles.** Resolution uses a visited set so `Node.neighbor → Node` cannot recurse forever.
- **Facts vs rules.** Comparison emits `ChangeFact`. Classification is a table. Severity can change without rewriting the walker.
- **Request/response inversion.** The table above is the core idea.
- **Fail closed.** Invalid specs never produce a partial report. Errors name `old` or `new`.
- **Stateless engine.** Express and the CLI are adapters. The same `compareSpecs` function powers the UI.

## License

MIT. See [LICENSE](LICENSE).
