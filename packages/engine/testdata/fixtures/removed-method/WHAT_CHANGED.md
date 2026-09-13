# Removed method

`GET /users/{id}` still exists. **DELETE** was removed.

**Later classification:** breaking for clients that still call DELETE (they will get 405).

This is a **method** remove, not a removed endpoint, because the path remains.
