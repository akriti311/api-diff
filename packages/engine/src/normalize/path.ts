/**
 * /users/{id}/posts/{postId}  →  /users/{}/posts/{}
 *
 * Static segments stay. Parameter *names* are ignored so
 * /users/{id} and /users/{userId} can be matched later.
 */
export function pathSignature(path: string): string {
  return path.replace(/\{[^}]+\}/g, "{}");
}

export function pathParameterNames(path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1] as string);
}

export function operationKey(method: string, signature: string): string {
  return `${method.toUpperCase()} ${signature}`;
}
