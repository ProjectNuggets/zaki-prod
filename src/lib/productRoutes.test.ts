import { describe, expect, it } from "@jest/globals";
import {
  getCanonicalAppProductRoute,
  getProductActivationRoute,
  getProductLaunchState,
  getProductMarketingRoute,
} from "./productRoutes";

describe("getCanonicalAppProductRoute", () => {
  it("maps only public V1 products to app surfaces", () => {
    expect(getCanonicalAppProductRoute("agent")).toBe("/agent");
    expect(getCanonicalAppProductRoute("zaki-bot")).toBe("/agent");
    expect(getCanonicalAppProductRoute("spaces")).toBe("/spaces");
    expect(getCanonicalAppProductRoute("chat")).toBe("/spaces");
    expect(getCanonicalAppProductRoute("brain")).toBe("/brain");

    expect(getCanonicalAppProductRoute("learning")).toBeNull();
    expect(getCanonicalAppProductRoute("learn")).toBeNull();
    expect(getCanonicalAppProductRoute("hire")).toBeNull();
    expect(getCanonicalAppProductRoute("design")).toBeNull();
  });

  it("returns null for unknown marketing-only slugs", () => {
    expect(getCanonicalAppProductRoute("complete")).toBeNull();
    expect(getCanonicalAppProductRoute(null)).toBeNull();
  });

  it("classifies launch states independently from operational registry state", () => {
    expect(getProductLaunchState("agent")).toBe("public_app");
    expect(getProductLaunchState("spaces")).toBe("public_app");
    expect(getProductLaunchState("brain")).toBe("public_app");
    expect(getProductLaunchState("learning")).toBe("private_beta");
    expect(getProductLaunchState("learn")).toBe("private_beta");
    expect(getProductLaunchState("hire")).toBe("private_beta");
    expect(getProductLaunchState("design")).toBe("waitlist");
    expect(getProductLaunchState("cli")).toBe("hidden");
    expect(getProductLaunchState("local_app")).toBe("hidden");
    expect(getProductLaunchState("extensions")).toBe("hidden");
    expect(getProductLaunchState("complete")).toBe("unknown");
  });

  it("keeps private beta and waitlist activation on website product pages", () => {
    expect(getProductMarketingRoute("learning")).toBe("/product");
    expect(getProductActivationRoute("learning")).toBe("/learn");
    expect(getProductActivationRoute("hire")).toBe("/hire");
    expect(getProductActivationRoute("design")).toBe("/design");
    expect(getProductActivationRoute("agent")).toBe("/agent");
    expect(getProductActivationRoute("spaces")).toBe("/spaces");
    expect(getProductActivationRoute("brain")).toBe("/brain");
    expect(getProductActivationRoute("cli")).toBeNull();
  });
});
