# Internal $ref

Both specs point at `#/components/schemas/User`. The `email` property was removed from that component.

The engine must follow the ref, not treat `$ref` as an opaque string.
