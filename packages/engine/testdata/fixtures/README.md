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
| `internal-ref` | Valid `#/components/schemas/User` — accepted now, resolved in Phase 7 |
| `renamed-path-param` | `/users/{id}` vs `/users/{userId}` — same path signature |
| `added-method` | `POST` added on an existing `/users/{id}` |
| `removed-method` | `DELETE` removed from `/users/{id}` |

`WHAT_CHANGED.md` in each folder is a human note. The engine will not read those files. They exist so you can practice explaining the change before we write comparison code.

In Phase 9 these pairs become automated tests (`expected.json`). Not yet.
