# Renamed path parameter

The path shape is the same: `/users/{something}`.

**Old:** `/users/{id}`  
**New:** `/users/{userId}`

After normalization both operations use the key `GET /users/{}`.

Later (Phase 4) this must **not** look like a removed endpoint plus an added endpoint.
