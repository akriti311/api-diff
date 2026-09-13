import { describe, expect, it } from "vitest";
import { operationKey, pathParameterNames, pathSignature } from "../src/normalize/path.js";

describe("pathSignature", () => {
  it("replaces each {param} with {}", () => {
    expect(pathSignature("/users/{id}")).toBe("/users/{}");
    expect(pathSignature("/users/{userId}/posts/{postId}")).toBe(
      "/users/{}/posts/{}"
    );
  });

  it("leaves static paths unchanged", () => {
    expect(pathSignature("/users")).toBe("/users");
  });

  it("does not treat different static paths as the same", () => {
    expect(pathSignature("/users/{id}")).not.toBe(pathSignature("/accounts/{id}"));
    expect(pathSignature("/users/{id}")).not.toBe(
      pathSignature("/users/{id}/email")
    );
  });
});

describe("operationKey", () => {
  it("combines METHOD and signature", () => {
    expect(operationKey("get", "/users/{}")).toBe("GET /users/{}");
  });

  it("treats {id} and {userId} as the same operation when the method matches", () => {
    const oldKey = operationKey("get", pathSignature("/users/{id}"));
    const newKey = operationKey("get", pathSignature("/users/{userId}"));
    expect(oldKey).toBe(newKey);
  });
});

describe("pathParameterNames", () => {
  it("keeps template order, not YAML order", () => {
    expect(pathParameterNames("/users/{userId}/posts/{postId}")).toEqual([
      "userId",
      "postId"
    ]);
  });
});
