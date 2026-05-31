import { describe, expect, it } from "@jest/globals";
import { getCanonicalAppProductRoute } from "./productRoutes";

describe("getCanonicalAppProductRoute", () => {
  it("maps public and gated products to app surfaces, not marketing pages", () => {
    expect(getCanonicalAppProductRoute("agent")).toBe("/agent");
    expect(getCanonicalAppProductRoute("zaki-bot")).toBe("/agent");
    expect(getCanonicalAppProductRoute("spaces")).toBe("/spaces");
    expect(getCanonicalAppProductRoute("brain")).toBe("/brain");
    expect(getCanonicalAppProductRoute("learning")).toBe("/learn");
    expect(getCanonicalAppProductRoute("learn")).toBe("/learn");
    expect(getCanonicalAppProductRoute("hire")).toBe("/hire");
    expect(getCanonicalAppProductRoute("design")).toBe("/design");
  });

  it("returns null for unknown marketing-only slugs", () => {
    expect(getCanonicalAppProductRoute("complete")).toBeNull();
    expect(getCanonicalAppProductRoute(null)).toBeNull();
  });
});

