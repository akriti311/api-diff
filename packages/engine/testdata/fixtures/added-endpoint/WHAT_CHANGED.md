# Added endpoint

**What changed:** `GET /users` exists only in the new spec.

**Later classification:** non-breaking.

**Why:** old clients never called this path. Adding it does not break them.
