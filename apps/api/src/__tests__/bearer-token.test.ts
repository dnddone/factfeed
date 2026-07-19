import { describe, expect, it } from "vitest";
import { bearerToken } from "@/utils/bearer-token";

describe("bearerToken", () => {
  it("extracts the token from a well-formed header", () => {
    expect(bearerToken("Bearer abc123")).toBe("abc123");
  });

  it("returns null for a missing header", () => {
    expect(bearerToken(null)).toBeNull();
  });

  it("returns null when the scheme isn't Bearer", () => {
    expect(bearerToken("Basic abc123")).toBeNull();
  });

  it("returns null for a Bearer header with no token", () => {
    expect(bearerToken("Bearer ")).toBeNull();
  });
});
