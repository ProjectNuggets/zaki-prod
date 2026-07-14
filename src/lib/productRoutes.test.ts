import { describe, expect, it } from "@jest/globals";
import {
  getCanonicalAppProductRoute,
  getProductActivationRoute,
  getProductLaunchState,
  getProductMarketingRoute,
  isProductVisibleInRelease,
  isReleaseSpoke,
  RELEASE_VISIBLE_SPOKES,
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
    expect(getCanonicalAppProductRoute("minutes")).toBeNull();
  });

  it("returns null for unknown marketing-only slugs", () => {
    expect(getCanonicalAppProductRoute("complete")).toBeNull();
    expect(getCanonicalAppProductRoute(null)).toBeNull();
  });

  it("classifies launch states independently from operational registry state", () => {
    expect(getProductLaunchState("agent")).toBe("public_app");
    expect(getProductLaunchState("spaces")).toBe("public_app");
    expect(getProductLaunchState("brain")).toBe("public_app");
    expect(getProductLaunchState("learning")).toBe("hidden");
    expect(getProductLaunchState("learn")).toBe("hidden");
    expect(getProductLaunchState("hire")).toBe("hidden");
    expect(getProductLaunchState("career")).toBe("hidden");
    expect(getProductLaunchState("design")).toBe("waitlist");
    expect(getProductLaunchState("minutes")).toBe("coming_soon");
    expect(getProductLaunchState("cli")).toBe("hidden");
    expect(getProductLaunchState("local_app")).toBe("hidden");
    expect(getProductLaunchState("extensions")).toBe("hidden");
    expect(getProductLaunchState("complete")).toBe("unknown");
  });

  it("keeps hidden products out of every activation path", () => {
    expect(getProductMarketingRoute("learning")).toBeNull();
    expect(getProductActivationRoute("learning")).toBeNull();
    expect(getProductActivationRoute("hire")).toBeNull();
    expect(getProductActivationRoute("design")).toBe("/design");
    expect(getProductActivationRoute("minutes")).toBe("/minutes");
    expect(getProductActivationRoute("agent")).toBe("/agent");
    expect(getProductActivationRoute("spaces")).toBe("/spaces");
    expect(getProductActivationRoute("brain")).toBe("/brain");
    expect(getProductActivationRoute("cli")).toBeNull();
  });

  it("locks the release to four spokes while keeping Brain as an Agent support view", () => {
    expect(RELEASE_VISIBLE_SPOKES).toEqual(["agent", "spaces", "design", "minutes"]);
    expect(RELEASE_VISIBLE_SPOKES).toHaveLength(4);
    expect(isReleaseSpoke("brain")).toBe(false);
    expect(isProductVisibleInRelease("brain")).toBe(true);
    expect(isProductVisibleInRelease("learning")).toBe(false);
    expect(isProductVisibleInRelease("hire")).toBe(false);
  });
});
