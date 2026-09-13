# Composed schema (allOf)

MVP does not merge `allOf` / `oneOf` / `anyOf`. We emit one composition warning and skip a deep merge.
