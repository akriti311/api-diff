# Removed endpoint

**What changed:** `GET /users/{id}/email` exists only in the old spec.

**Later classification:** breaking.

**Why:** a client that still calls this path will get 404. The rest of the API can stay the same.
