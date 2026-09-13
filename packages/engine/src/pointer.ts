/** JSON Pointer escaping (RFC 6901). */
export function escapePointerToken(token: string): string {
  return token.replaceAll("~", "~0").replaceAll("/", "~1");
}

export function operationPointer(path: string, method: string): string {
  return `/paths/${escapePointerToken(path)}/${method.toLowerCase()}`;
}
