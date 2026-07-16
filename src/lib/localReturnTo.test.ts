import { describe, expect, it } from "@jest/globals";
import { sanitizeLocalReturnTo } from "./localReturnTo";

describe("sanitizeLocalReturnTo", () => {
  const authReturnOptions = {
    fallback: "",
    stripSearchParams: ["auth"],
    requireLeadingSlash: true,
    allowRoot: false,
  };

  it("preserves an app-local path, query, and fragment after removing auth state", () => {
    expect(
      sanitizeLocalReturnTo("/brain?auth=login&panel=clusters#memory", authReturnOptions)
    ).toBe("/brain?panel=clusters#memory");
    expect(sanitizeLocalReturnTo("/brain//related", authReturnOptions)).toBe(
      "/brain//related"
    );
  });

  it.each([
    "/./\\evil.example/brain",
    "/brain/../\\evil.example/brain",
    "/.//evil.example/brain",
    "/%5cevil.example/brain",
    "/%2f%2fevil.example/brain",
  ])("rejects a path that can normalize into another origin: %s", (unsafeReturnTo) => {
    expect(sanitizeLocalReturnTo(unsafeReturnTo, authReturnOptions)).toBe("");
  });

  it("uses the caller's local fallback for rejected routes", () => {
    expect(
      sanitizeLocalReturnTo("https://evil.example/brain", {
        fallback: "/spaces",
      })
    ).toBe("/spaces");
  });
});
