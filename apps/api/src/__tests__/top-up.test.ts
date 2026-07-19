import { describe, expect, it } from "vitest";
import { shouldTopUp } from "@/top-up";
import { isAuthorizedCronRequest } from "@/utils/cron-auth";

describe("shouldTopUp", () => {
  it("tops up when the pool is below the threshold", () => {
    expect(shouldTopUp({ poolSize: 50, threshold: 100 })).toBe(true);
  });

  it("no-ops when the pool is at or above the threshold", () => {
    expect(shouldTopUp({ poolSize: 100, threshold: 100 })).toBe(false);
    expect(shouldTopUp({ poolSize: 150, threshold: 100 })).toBe(false);
  });
});

describe("isAuthorizedCronRequest", () => {
  it("accepts a matching bearer token", () => {
    expect(
      isAuthorizedCronRequest({
        authorizationHeader: "Bearer super-secret",
        secret: "super-secret",
      }),
    ).toBe(true);
  });

  it("rejects a wrong token", () => {
    expect(
      isAuthorizedCronRequest({
        authorizationHeader: "Bearer wrong",
        secret: "super-secret",
      }),
    ).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(
      isAuthorizedCronRequest({
        authorizationHeader: null,
        secret: "super-secret",
      }),
    ).toBe(false);
  });

  it("rejects when CRON_SECRET isn't configured, even with a header", () => {
    expect(
      isAuthorizedCronRequest({
        authorizationHeader: "Bearer anything",
        secret: undefined,
      }),
    ).toBe(false);
  });
});
