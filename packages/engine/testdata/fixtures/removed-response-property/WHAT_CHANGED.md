# Removed response property

**Operation:** `GET /users/{id}`

**What changed:** the `200` JSON object no longer includes `name`.

**Later classification (Phase 8):** breaking.

**Why:** a client written against the old contract may still read `user.name`. The new contract does not promise that field.

This is the example we will use in interviews.
