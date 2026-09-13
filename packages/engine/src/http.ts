export const HTTP_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace"
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export const HTTP_METHOD_SET = new Set<string>(HTTP_METHODS);

export const JSON_MEDIA_TYPE = "application/json";
