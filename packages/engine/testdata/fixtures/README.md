# Sample OpenAPI fixtures

These are **example API contracts**, not application code.

Each folder is one before/after pair:

| Folder | What to notice |
|---|---|
| `removed-response-property` | Hero example: `name` disappears from `GET /users/{id}` |
| `identical` | Both files are the same — later, the report should be empty |
| `added-endpoint` | New path `GET /users` — later, non-breaking |
| `removed-endpoint` | `GET /users/{id}` is gone — later, breaking |
| `json-format` | Same idea as the hero example, but written as JSON |
| `internal-ref` | `$ref` to User; `email` removed from the component |
| `circular-ref` | `Node.neighbor` → `Node` (must not hang) |
| `type-changed` | response `id` integer → string |
| `enum-request-removed` | request enum lost `cancelled` |
| `enum-response-added` | response enum gained `refunded` |
| `nested-property-removed` | `address.city` removed |
| `response-property-added` | optional `nickname` added |
| `composed-schema` | unchanged `allOf` (not fully analyzed) |
| `renamed-path-param` | `/users/{id}` vs `/users/{userId}` — same path signature |
| `added-method` | `POST` added on an existing `/users/{id}` |
| `removed-method` | `DELETE` removed from `/users/{id}` |
| `required-param-added` | required query `status` added |
| `optional-param-added` | optional query `verbose` added |
| `optional-to-required` | query `limit` became required |
| `required-to-optional` | query `limit` became optional |
| `param-removed` | query `verbose` removed |
| `request-body-added` | required JSON body added to POST |
| `request-body-removed` | request body removed |
| `request-body-became-required` | optional body became required |
| `success-response-removed` | `200` removed, `404` remains |
| `success-response-added` | `201` added next to `200` |

`WHAT_CHANGED.md` in each folder is a human note. The engine will not read those files. They exist so you can practice explaining the change before we write comparison code.

In Phase 9 these pairs become automated tests (`expected.json`). Not yet.
